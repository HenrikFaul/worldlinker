import { getSupabase, isCloudConfigured } from '../lib/supabase';
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

interface RemoteState {
  coins: number;
  max_level: number;
  level_stars: Record<number, number> | null;
  daily_streak: number;
  last_daily_date: string | null;
}

let initialized = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

const laterDate = (a: string | null, b: string | null): string | null => {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b; // YYYY-MM-DD compares correctly as strings
};

/** Sign in (anonymously) and reconcile local ↔ cloud save. Safe to call once. */
export async function initCloud(): Promise<void> {
  if (!isCloudConfigured() || initialized) return;
  initialized = true;

  const supabase = await getSupabase();
  if (!supabase) return;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      // anonymous auth disabled, offline, blocked egress, etc. — stay local-only
      console.warn('[cloud] sign-in unavailable:', error.message);
      return;
    }
  }

  await pullAndMerge();
  // push subsequent local changes (debounced); added AFTER the merge so the
  // merge's own setState doesn't immediately echo back.
  useGameStore.subscribe(schedulePush);
}

async function pullAndMerge(): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;
  const { data, error } = await supabase.rpc('wl_load_state');
  if (error) {
    console.warn('[cloud] load failed:', error.message);
    return;
  }

  if (!data) {
    await pushNow(); // first device — seed the cloud row
    return;
  }

  const remote = data as RemoteState;
  const s = useGameStore.getState();
  const mergedStars: Record<number, number> = { ...(remote.level_stars ?? {}) };
  for (const [k, v] of Object.entries(s.levelStars)) {
    mergedStars[+k] = Math.max(mergedStars[+k] ?? 0, v);
  }

  useGameStore.setState({
    coins: Math.max(s.coins, remote.coins ?? 0),
    maxLevel: Math.max(s.maxLevel, remote.max_level ?? 1),
    levelStars: mergedStars,
    dailyStreak: Math.max(s.dailyStreak, remote.daily_streak ?? 0),
    lastDailyDate: laterDate(s.lastDailyDate, remote.last_daily_date ?? null),
  });

  await pushNow(); // write the merged result back
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(), 1500);
}

async function pushNow(): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;
  const s = useGameStore.getState();
  const { error } = await supabase.rpc('wl_save_state', {
    p_coins: s.coins,
    p_max_level: s.maxLevel,
    p_level_stars: s.levelStars,
    p_daily_streak: s.dailyStreak,
    p_last_daily_date: s.lastDailyDate,
  });
  if (error) console.warn('[cloud] save failed:', error.message);
}

/** Submit a finished daily to the leaderboard; returns the new streak + rank. */
export async function submitDailyResult(
  payload: DailySubmitPayload,
): Promise<{ streak?: number; rank?: number | null } | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('wl_submit_daily', {
    p_date: payload.date,
    p_stars: payload.stars,
    p_found: payload.found,
    p_total: payload.total,
    p_bonus: payload.bonus,
    p_time_ms: payload.time_ms ?? 0,
  });
  if (error) {
    console.warn('[cloud] daily submit failed:', error.message);
    return null;
  }
  return data as { streak?: number; rank?: number | null };
}

/** Fetch the daily leaderboard for a given date key. */
export async function fetchLeaderboard(dateKey: string): Promise<LeaderboardRow[] | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('wl_leaderboard', { p_date: dateKey, p_limit: 50 });
  if (error) return null;
  return data as LeaderboardRow[];
}
