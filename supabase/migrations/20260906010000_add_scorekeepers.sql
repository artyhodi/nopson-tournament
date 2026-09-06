create table if not exists public.tournament_admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.tournament_admins enable row level security;
revoke all on table public.tournament_admins from anon, authenticated;
grant select on table public.tournament_admins to authenticated;

drop policy if exists "Admins can read their own membership" on public.tournament_admins;
create policy "Admins can read their own membership"
on public.tournament_admins for select
to authenticated
using (email = lower(auth.jwt() ->> 'email'));

grant update (
  team_1_set_1, team_2_set_1,
  team_1_set_2, team_2_set_2,
  team_1_tiebreak, team_2_tiebreak,
  status, winner
) on public.tournament_matches to authenticated;

drop policy if exists "Approved scorers can update matches" on public.tournament_matches;
create policy "Approved scorers can update matches"
on public.tournament_matches for update
to authenticated
using (
  exists (
    select 1 from public.tournament_admins
    where email = lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1 from public.tournament_admins
    where email = lower(auth.jwt() ->> 'email')
  )
);
