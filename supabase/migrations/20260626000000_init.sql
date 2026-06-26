-- Word Linker — initial schema: profiles, cloud save, daily results + leaderboard.
-- Designed for local-first play with an optional cloud layer (anonymous auth ok).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Word Lover',
  country_code text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- display names are public so leaderboards can show them
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- game_state — one cloud-save row per user
-- ---------------------------------------------------------------------------
create table if not exists public.game_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins int not null default 0,
  max_level int not null default 1,
  level_stars jsonb not null default '{}'::jsonb,
  daily_streak int not null default 0,
  last_daily_date date,
  updated_at timestamptz not null default now()
);

alter table public.game_state enable row level security;

drop policy if exists "game_state self" on public.game_state;
create policy "game_state self" on public.game_state
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_results — one result per user per day (feeds the leaderboard)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_results (
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

alter table public.daily_results enable row level security;

drop policy if exists "daily_results self" on public.daily_results;
create policy "daily_results self" on public.daily_results
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists daily_results_date_idx on public.daily_results (date);

-- ---------------------------------------------------------------------------
-- table privileges (RLS still restricts which *rows* each user can touch)
-- ---------------------------------------------------------------------------
grant select on public.profiles to anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.game_state to authenticated;
grant select, insert, update, delete on public.daily_results to authenticated;

-- ---------------------------------------------------------------------------
-- auto-provision profile + game_state for every new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.game_state (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- leaderboard read path (security definer so it can join profiles + rank
-- without exposing every result row directly)
-- ---------------------------------------------------------------------------
create or replace function public.daily_leaderboard(p_date date, p_limit int default 50)
returns table (
  display_name text,
  stars int,
  found int,
  bonus int,
  time_ms int,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.display_name,
    dr.stars,
    dr.found,
    dr.bonus,
    dr.time_ms,
    rank() over (order by dr.stars desc, dr.bonus desc, dr.time_ms asc) as rank
  from public.daily_results dr
  join public.profiles pr on pr.user_id = dr.user_id
  where dr.date = p_date
  order by rank
  limit greatest(1, least(p_limit, 200));
$$;

grant execute on function public.daily_leaderboard(date, int) to anon, authenticated;
