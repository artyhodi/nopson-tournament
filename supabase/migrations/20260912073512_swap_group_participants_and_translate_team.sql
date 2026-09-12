with fixture_updates(match_id, team_1, team_2) as (
  values
    ('A2-A5', 'SO LUCKY JO TEAM', 'MaFia TEAM'),
    ('B2-B5', 'RAWRR TEAM', 'RALLÉ TEAM'),
    ('A3-A4', 'EUNA JAESUN TEAM', 'LOOFAH 🧽'),
    ('B3-B4', 'TITI & DIEGO', 'JS TEAM'),
    ('A1-A5', 'NOPSON TEAM', 'MaFia TEAM'),
    ('B1-B5', 'KILLER TEAM', 'RALLÉ TEAM'),
    ('A2-A3', 'SO LUCKY JO TEAM', 'EUNA JAESUN TEAM'),
    ('B2-B3', 'RAWRR TEAM', 'TITI & DIEGO'),
    ('A1-A4', 'NOPSON TEAM', 'LOOFAH 🧽'),
    ('B1-B4', 'KILLER TEAM', 'JS TEAM'),
    ('A3-A5', 'EUNA JAESUN TEAM', 'MaFia TEAM'),
    ('B3-B5', 'TITI & DIEGO', 'RALLÉ TEAM'),
    ('A2-A4', 'SO LUCKY JO TEAM', 'LOOFAH 🧽'),
    ('B2-B4', 'RAWRR TEAM', 'JS TEAM'),
    ('A1-A3', 'NOPSON TEAM', 'EUNA JAESUN TEAM'),
    ('B1-B3', 'KILLER TEAM', 'TITI & DIEGO'),
    ('A4-A5', 'LOOFAH 🧽', 'MaFia TEAM'),
    ('B4-B5', 'JS TEAM', 'RALLÉ TEAM'),
    ('A1-A2', 'NOPSON TEAM', 'SO LUCKY JO TEAM'),
    ('B1-B2', 'KILLER TEAM', 'RAWRR TEAM')
)
update public.tournament_matches as match
set
  team_1 = fixture.team_1,
  team_2 = fixture.team_2,
  team_1_set_1 = 0,
  team_2_set_1 = 0,
  team_1_set_2 = 0,
  team_2_set_2 = 0,
  team_1_set_3 = 0,
  team_2_set_3 = 0,
  team_1_tiebreak = 0,
  team_2_tiebreak = 0,
  status = 'Not started',
  winner = null
from fixture_updates as fixture
where match.match_id = fixture.match_id;

update public.tournament_matches
set
  team_1 = case match_id
    when 'SF1' then 'Group A · Rank 1'
    when 'SF2' then 'Group B · Rank 1'
    when 'FINAL' then 'Winner · Semifinal 1'
    when 'THIRD' then 'Loser · Semifinal 1'
  end,
  team_2 = case match_id
    when 'SF1' then 'Group B · Rank 2'
    when 'SF2' then 'Group A · Rank 2'
    when 'FINAL' then 'Winner · Semifinal 2'
    when 'THIRD' then 'Loser · Semifinal 2'
  end,
  team_1_set_1 = 0,
  team_2_set_1 = 0,
  team_1_set_2 = 0,
  team_2_set_2 = 0,
  team_1_set_3 = 0,
  team_2_set_3 = 0,
  team_1_tiebreak = 0,
  team_2_tiebreak = 0,
  status = 'Not started',
  winner = null
where match_id in ('SF1', 'SF2', 'FINAL', 'THIRD');
