update public.tournament_matches
set team_1 = 'ONE TEAM'
where stage = 'Group A'
  and team_1 = 'EUNA JAESUN TEAM';

update public.tournament_matches
set team_2 = 'ONE TEAM'
where stage = 'Group A'
  and team_2 = 'EUNA JAESUN TEAM';
