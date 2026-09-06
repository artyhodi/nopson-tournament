alter policy "Admins can read their own membership"
on public.tournament_admins
using (email = lower((select auth.jwt()) ->> 'email'));

alter policy "Approved scorers can update matches"
on public.tournament_matches
using (
  exists (
    select 1
    from public.tournament_admins
    where tournament_admins.email = lower((select auth.jwt()) ->> 'email')
  )
)
with check (
  exists (
    select 1
    from public.tournament_admins
    where tournament_admins.email = lower((select auth.jwt()) ->> 'email')
  )
);
