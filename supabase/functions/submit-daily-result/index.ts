// Word Linker — submit a Daily Word result.
// Verifies the caller's JWT, upserts their result for the day, and recomputes
// their streak server-side. This is the anti-cheat entry point from the design
// spec; word validation against a server dictionary can be layered in later.
//
// Deploy: supabase functions deploy submit-daily-result
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const prevDay = (key: string) => {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing authorization' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return json({ error: 'invalid token' }, 401);
  const userId = auth.user.id;

  let payload: {
    date?: string;
    stars?: number;
    found?: number;
    total?: number;
    bonus?: number;
    time_ms?: number;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const date = payload.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'invalid date' }, 400);

  const clampInt = (v: unknown, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
  const result = {
    user_id: userId,
    date,
    stars: clampInt(payload.stars, 0, 3),
    found: clampInt(payload.found, 0, 1000),
    total: clampInt(payload.total, 0, 1000),
    bonus: clampInt(payload.bonus, 0, 1000),
    time_ms: clampInt(payload.time_ms, 0, 86_400_000),
  };

  // upsert today's result (RLS ensures user can only write their own row)
  const { error: upErr } = await supabase
    .from('daily_results')
    .upsert(result, { onConflict: 'user_id,date' });
  if (upErr) return json({ error: upErr.message }, 400);

  // recompute streak server-side from the saved state
  const { data: gs } = await supabase
    .from('game_state')
    .select('daily_streak, last_daily_date')
    .eq('user_id', userId)
    .maybeSingle();

  let streak = 1;
  if (gs?.last_daily_date === date) {
    streak = gs.daily_streak || 1; // already submitted today — keep
  } else if (gs?.last_daily_date === prevDay(date)) {
    streak = (gs.daily_streak || 0) + 1;
  }

  await supabase
    .from('game_state')
    .update({ daily_streak: streak, last_daily_date: date, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  // caller's rank for the day
  const { data: board } = await supabase.rpc('daily_leaderboard', { p_date: date, p_limit: 200 });
  const rank =
    (board ?? []).findIndex(
      (r: { stars: number; bonus: number }) => r.stars === result.stars && r.bonus === result.bonus,
    ) + 1 || null;

  return json({ ok: true, streak, rank });
});
