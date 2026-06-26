-- Word Linker — co-located in the GeoData Supabase project under a dedicated
-- schema. This is the exact migration applied to that project.
--
-- All TABLES live in word_linker.*. Because `public` is the only
-- PostgREST-exposed schema on that project, the client API surface is a set of
-- wl_*-prefixed SECURITY DEFINER functions in `public` (the only Word Linker
-- objects outside the dedicated schema). No GeoData object is modified.
--
-- For a dedicated project you could instead expose the `word_linker` schema
-- (Settings → API → Exposed schemas) and use the JS client's `db.schema`
-- option for direct table access.

create schema if not exists word_linker;
grant usage on schema word_linker to anon, authenticated, service_role;

-- ---- tables (RLS on, no policies: direct REST access denied; reached only via
--      the SECURITY DEFINER functions below) ------------------------------
create table if not exists word_linker.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Word Lover',
  country_code text,
  created_at timestamptz not null default now()
);
alter table word_linker.profiles enable row level security;

create table if not exists word_linker.game_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins int not null default 0,
  max_level int not null default 1,
  level_stars jsonb not null default '{}'::jsonb,
  daily_streak int not null default 0,
  last_daily_date date,
  updated_at timestamptz not null default now()
);
alter table word_linker.game_state enable row level security;

create table if not exists word_linker.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  stars int not null default 0,
  found int not null default 0,
  total int not null default 0,
  bonus int not null default 0,
  time_ms int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table word_linker.daily_results enable row level security;
create index if not exists wl_daily_results_date_idx on word_linker.daily_results (date);

-- ---- API: wl_* functions in public (auth.uid() identifies the caller) ------
create or replace function public.wl_load_state()
returns jsonb
language sql stable security definer set search_path = word_linker, public
as $$
  select to_jsonb(g) from word_linker.game_state g where g.user_id = auth.uid();
$$;

create or replace function public.wl_save_state(
  p_coins int, p_max_level int, p_level_stars jsonb, p_daily_streak int, p_last_daily_date date
) returns void
language plpgsql security definer set search_path = word_linker, public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into word_linker.profiles (user_id) values (auth.uid()) on conflict do nothing;
  insert into word_linker.game_state (user_id, coins, max_level, level_stars, daily_streak, last_daily_date, updated_at)
  values (auth.uid(), coalesce(p_coins,0), coalesce(p_max_level,1), coalesce(p_level_stars,'{}'::jsonb), coalesce(p_daily_streak,0), p_last_daily_date, now())
  on conflict (user_id) do update set
    coins = excluded.coins, max_level = excluded.max_level, level_stars = excluded.level_stars,
    daily_streak = excluded.daily_streak, last_daily_date = excluded.last_daily_date, updated_at = now();
end;
$$;

create or replace function public.wl_submit_daily(
  p_date date, p_stars int, p_found int, p_total int, p_bonus int, p_time_ms int default 0
) returns jsonb
language plpgsql security definer set search_path = word_linker, public
as $$
declare v_uid uuid := auth.uid(); v_last date; v_streak int; v_rank int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into word_linker.profiles (user_id) values (v_uid) on conflict do nothing;
  insert into word_linker.daily_results (user_id, date, stars, found, total, bonus, time_ms)
  values (v_uid, p_date, greatest(0, least(3, coalesce(p_stars,0))), greatest(0, coalesce(p_found,0)),
          greatest(0, coalesce(p_total,0)), greatest(0, coalesce(p_bonus,0)), greatest(0, coalesce(p_time_ms,0)))
  on conflict (user_id, date) do update set
    stars = excluded.stars, found = excluded.found, total = excluded.total,
    bonus = excluded.bonus, time_ms = excluded.time_ms;

  select last_daily_date, daily_streak into v_last, v_streak from word_linker.game_state where user_id = v_uid;
  if v_last = p_date then v_streak := coalesce(v_streak, 1);
  elsif v_last = (p_date - 1) then v_streak := coalesce(v_streak, 0) + 1;
  else v_streak := 1; end if;

  insert into word_linker.game_state (user_id, daily_streak, last_daily_date, updated_at)
  values (v_uid, v_streak, p_date, now())
  on conflict (user_id) do update set daily_streak = v_streak, last_daily_date = p_date, updated_at = now();

  select count(*) + 1 into v_rank from word_linker.daily_results d
   where d.date = p_date and (d.stars > p_stars or (d.stars = p_stars and d.bonus > p_bonus));
  return jsonb_build_object('streak', v_streak, 'rank', v_rank);
end;
$$;

create or replace function public.wl_leaderboard(p_date date, p_limit int default 50)
returns table (display_name text, stars int, found int, bonus int, time_ms int, rank bigint)
language sql stable security definer set search_path = word_linker, public
as $$
  select pr.display_name, dr.stars, dr.found, dr.bonus, dr.time_ms,
    rank() over (order by dr.stars desc, dr.bonus desc, dr.time_ms asc) as rank
  from word_linker.daily_results dr
  join word_linker.profiles pr on pr.user_id = dr.user_id
  where dr.date = p_date
  order by rank
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

-- least privilege: leaderboard is anon-readable; the rest require a signed-in
-- (incl. anonymous-auth) user, whose role is `authenticated`.
revoke all on function public.wl_load_state() from public;
revoke all on function public.wl_save_state(int, int, jsonb, int, date) from public;
revoke all on function public.wl_submit_daily(date, int, int, int, int, int) from public;
revoke all on function public.wl_leaderboard(date, int) from public;
revoke execute on function public.wl_load_state() from anon;
revoke execute on function public.wl_save_state(int, int, jsonb, int, date) from anon;
revoke execute on function public.wl_submit_daily(date, int, int, int, int, int) from anon;
grant execute on function public.wl_load_state() to authenticated;
grant execute on function public.wl_save_state(int, int, jsonb, int, date) to authenticated;
grant execute on function public.wl_submit_daily(date, int, int, int, int, int) to authenticated;
grant execute on function public.wl_leaderboard(date, int) to anon, authenticated;
