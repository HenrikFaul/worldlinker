import { supabase, isCloudEnabled } from '../lib/supabase';
import { useGameStore } from './gameStore';

export interface LeaderboardRow {
  display_name: string;
  stars: number;
  found: number;
  bonus: number;
  time_ms: number;
  rank: number;
}

export interface DailySubmitPayload {
  date: string;
  stars: number;
  found: number;
  total: number;
  bonus: number;
  time_ms?: number;
}

let initialized = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

const laterDate = (a: string | null, b: string | null): string | null => {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b; // YYYY-MM-DD compares correctly as strings
};

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Sign in (anonymously) and reconcile local ↔ cloud save. Safe to call once. */
export async function initCloud(): Promise<void> {
  if (!isCloudEnabled() || !supabase || initialized) return;
  initialized = true;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      // anonymous auth not enabled, offline, etc. — stay local-only
      console.warn('[cloud] sign-in unavailable:', error.message);
      return;
    }
  }

  await pullAndMerge();
  // push subsequent local changes (debounced). Added AFTER the merge so the
  // merge's own setState doesn't immediately echo back.
  useGameStore.subscribe(schedulePush);
}

async function pullAndMerge(): Promise<void> {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;

  const { data, error } = await supabase
    .from('game_state')
    .select('coins, max_level, level_stars, daily_streak, last_daily_date')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return;

  if (!data) {
    await pushNow(); // first device — seed the cloud row
    return;
  }

  const s = useGameStore.getState();
  const mergedStars: Record<number, number> = { ...((data.level_stars as Record<number, number>) ?? {}) };
  for (const [k, v] of Object.entries(s.levelStars)) {
    mergedStars[+k] = Math.max(mergedStars[+k] ?? 0, v);
  }

  useGameStore.setState({
    coins: Math.max(s.coins, data.coins ?? 0),
    maxLevel: Math.max(s.maxLevel, data.max_level ?? 1),
    levelStars: mergedStars,
    dailyStreak: Math.max(s.dailyStreak, data.daily_streak ?? 0),
    lastDailyDate: laterDate(s.lastDailyDate, data.last_daily_date ?? null),
  });

  await pushNow(); // write the merged result back
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(), 1500);
}

async function pushNow(): Promise<void> {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const s = useGameStore.getState();
  await supabase.from('game_state').upsert({
    user_id: userId,
    coins: s.coins,
    max_level: s.maxLevel,
    level_stars: s.levelStars,
    daily_streak: s.dailyStreak,
    last_daily_date: s.lastDailyDate,
    updated_at: new Date().toISOString(),
  });
}

/** Submit a finished daily to the leaderboard via the edge function. */
export async function submitDailyResult(
  payload: DailySubmitPayload,
): Promise<{ ok: boolean; streak?: number; rank?: number | null } | null> {
  if (!supabase || !isCloudEnabled()) return null;
  const { data, error } = await supabase.functions.invoke('submit-daily-result', { body: payload });
  if (error) {
    console.warn('[cloud] daily submit failed:', error.message);
    return null;
  }
  return data;
}

/** Fetch the daily leaderboard for a given date key. */
export async function fetchLeaderboard(dateKey: string): Promise<LeaderboardRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('daily_leaderboard', { p_date: dateKey, p_limit: 50 });
  if (error) return null;
  return data as LeaderboardRow[];
}
