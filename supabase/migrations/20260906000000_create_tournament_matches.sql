create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.tournament_matches (
  match_id text primary key,
  sort_order integer not null unique,
  stage text not null check (stage in ('Group A', 'Group B', 'Semifinal', 'Final', 'Third place')),
  round_number smallint,
  court smallint not null check (court in (2, 4)),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  team_1 text not null,
  team_2 text not null,
  team_1_set_1 smallint not null default 0 check (team_1_set_1 >= 0),
  team_2_set_1 smallint not null default 0 check (team_2_set_1 >= 0),
  team_1_set_2 smallint not null default 0 check (team_1_set_2 >= 0),
  team_2_set_2 smallint not null default 0 check (team_2_set_2 >= 0),
  team_1_tiebreak smallint not null default 0 check (team_1_tiebreak >= 0),
  team_2_tiebreak smallint not null default 0 check (team_2_tiebreak >= 0),
  status text not null default 'Not started' check (status in ('Not started', 'Live', 'Completed')),
  winner smallint check (winner in (1, 2)),
  updated_at timestamptz not null default now(),
  constraint winner_required_when_completed check (status <> 'Completed' or winner is not null),
  constraint winner_empty_before_completed check (status = 'Completed' or winner is null),
  constraint schedule_is_valid check (scheduled_end > scheduled_start)
);

alter table public.tournament_matches enable row level security;
revoke all on table public.tournament_matches from anon, authenticated;
grant select on table public.tournament_matches to anon, authenticated;

drop policy if exists "Tournament scores are publicly readable" on public.tournament_matches;
create policy "Tournament scores are publicly readable"
on public.tournament_matches for select
to anon, authenticated
using (true);

create or replace function private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
drop trigger if exists tournament_matches_set_updated_at on public.tournament_matches;
create trigger tournament_matches_set_updated_at
before update on public.tournament_matches
for each row execute function private.set_updated_at();

insert into public.tournament_matches
  (match_id, sort_order, stage, round_number, court, scheduled_start, scheduled_end, team_1, team_2)
values
  ('A1-A2', 1, 'Group A', 1, 2, '2026-09-19 11:00:00+09', '2026-09-19 11:30:00+09', 'NOPSON TEAM', 'SJ TEAM'),
  ('A3-A4', 2, 'Group A', 1, 2, '2026-09-19 11:30:00+09', '2026-09-19 12:00:00+09', 'FJ TEAM', '은아재선 TEAM'),
  ('B1-B2', 3, 'Group B', 1, 4, '2026-09-19 11:00:00+09', '2026-09-19 11:30:00+09', 'KILLER TEAM', 'TIGER TEAM'),
  ('B3-B4', 4, 'Group B', 1, 4, '2026-09-19 11:30:00+09', '2026-09-19 12:00:00+09', 'DS TEAM', 'ML TEAM'),
  ('A1-A3', 5, 'Group A', 2, 2, '2026-09-19 12:10:00+09', '2026-09-19 12:40:00+09', 'NOPSON TEAM', 'FJ TEAM'),
  ('A2-A4', 6, 'Group A', 2, 2, '2026-09-19 12:40:00+09', '2026-09-19 13:10:00+09', 'SJ TEAM', '은아재선 TEAM'),
  ('B1-B3', 7, 'Group B', 2, 4, '2026-09-19 12:10:00+09', '2026-09-19 12:40:00+09', 'KILLER TEAM', 'DS TEAM'),
  ('B2-B4', 8, 'Group B', 2, 4, '2026-09-19 12:40:00+09', '2026-09-19 13:10:00+09', 'TIGER TEAM', 'ML TEAM'),
  ('A1-A4', 9, 'Group A', 3, 2, '2026-09-19 13:20:00+09', '2026-09-19 13:50:00+09', 'NOPSON TEAM', '은아재선 TEAM'),
  ('A2-A3', 10, 'Group A', 3, 2, '2026-09-19 13:50:00+09', '2026-09-19 14:20:00+09', 'SJ TEAM', 'FJ TEAM'),
  ('B1-B4', 11, 'Group B', 3, 4, '2026-09-19 13:20:00+09', '2026-09-19 13:50:00+09', 'KILLER TEAM', 'ML TEAM'),
  ('B2-B3', 12, 'Group B', 3, 4, '2026-09-19 13:50:00+09', '2026-09-19 14:20:00+09', 'TIGER TEAM', 'DS TEAM'),
  ('SF1', 13, 'Semifinal', null, 2, '2026-09-19 14:40:00+09', '2026-09-19 15:40:00+09', 'Group A · Rank 1', 'Group B · Rank 2'),
  ('SF2', 14, 'Semifinal', null, 4, '2026-09-19 14:40:00+09', '2026-09-19 15:40:00+09', 'Group B · Rank 1', 'Group A · Rank 2'),
  ('FINAL', 15, 'Final', null, 2, '2026-09-19 16:00:00+09', '2026-09-19 17:15:00+09', 'Winner · Semifinal 1', 'Winner · Semifinal 2'),
  ('THIRD', 16, 'Third place', null, 4, '2026-09-19 16:00:00+09', '2026-09-19 17:15:00+09', 'Loser · Semifinal 1', 'Loser · Semifinal 2')
on conflict (match_id) do update set
  sort_order = excluded.sort_order, stage = excluded.stage, round_number = excluded.round_number,
  court = excluded.court, scheduled_start = excluded.scheduled_start, scheduled_end = excluded.scheduled_end,
  team_1 = excluded.team_1, team_2 = excluded.team_2;

alter publication supabase_realtime add table public.tournament_matches;
