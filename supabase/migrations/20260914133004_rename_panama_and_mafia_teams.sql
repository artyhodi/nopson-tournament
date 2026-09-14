update public.tournament_matches
set team_1 = case team_1
  when 'TITI & DIEGO' then 'PANAMA TEAM'
  when 'MaFia TEAM' then 'MAFIA TEAM'
  else team_1
end,
team_2 = case team_2
  when 'TITI & DIEGO' then 'PANAMA TEAM'
  when 'MaFia TEAM' then 'MAFIA TEAM'
  else team_2
end
where team_1 in ('TITI & DIEGO', 'MaFia TEAM')
   or team_2 in ('TITI & DIEGO', 'MaFia TEAM');
