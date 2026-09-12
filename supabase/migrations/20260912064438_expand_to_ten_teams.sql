create or replace function public.sync_semifinal_draw()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  a_rank_1 text := 'Group A · Rank 1';
  a_rank_2 text := 'Group A · Rank 2';
  b_rank_1 text := 'Group B · Rank 1';
  b_rank_2 text := 'Group B · Rank 2';
  a_complete boolean := false;
  b_complete boolean := false;
  a_random_required boolean := false;
  b_random_required boolean := false;
begin
  if (case when tg_op = 'DELETE' then old.stage else new.stage end) not in ('Group A', 'Group B') then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select count(*) = 10 into a_complete
  from public.tournament_matches
  where stage = 'Group A' and status = 'Completed';

  select count(*) = 10 into b_complete
  from public.tournament_matches
  where stage = 'Group B' and status = 'Completed';

  with slot_teams as (
    select left(match_id, 2) as slot, right(stage, 1) as group_code, team_1 as team_name
    from public.tournament_matches where stage in ('Group A', 'Group B')
    union
    select right(match_id, 2), right(stage, 1), team_2
    from public.tournament_matches where stage in ('Group A', 'Group B')
  ),
  stats as (
    select
      st.slot, st.group_code, st.team_name,
      count(*) filter (
        where m.status = 'Completed'
          and ((left(m.match_id, 2) = st.slot and m.winner = 1)
            or (right(m.match_id, 2) = st.slot and m.winner = 2))
      )::integer as match_wins,
      coalesce(sum(case
        when m.status <> 'Completed' then 0
        when left(m.match_id, 2) = st.slot then m.team_1_set_1
        else m.team_2_set_1 end), 0)::integer as games_for,
      coalesce(sum(case
        when m.status <> 'Completed' then 0
        when left(m.match_id, 2) = st.slot then m.team_2_set_1
        else m.team_1_set_1 end), 0)::integer as games_against
    from slot_teams st
    join public.tournament_matches m
      on m.stage = 'Group ' || st.group_code
     and (left(m.match_id, 2) = st.slot or right(m.match_id, 2) = st.slot)
    group by st.slot, st.group_code, st.team_name
  ),
  tied as (
    select s.*, count(*) over (partition by group_code, match_wins) as tie_count
    from stats s
  ),
  paired as (
    select t.*,
      case when tie_count = 2 then (
        select o.slot from tied o
        where o.group_code = t.group_code
          and o.match_wins = t.match_wins
          and o.slot <> t.slot
        limit 1
      ) end as other_slot
    from tied t
  ),
  metrics as (
    select p.*,
      case when p.games_for + p.games_against = 0 then 0::numeric
        else p.games_for::numeric / (p.games_for + p.games_against) end as game_win_pct,
      p.games_for - p.games_against as game_diff,
      case when p.tie_count = 2 then coalesce((
        select case
          when m.winner = 1 and left(m.match_id, 2) = p.slot then 1
          when m.winner = 2 and right(m.match_id, 2) = p.slot then 1
          else 0 end
        from public.tournament_matches m
        where m.stage = 'Group ' || p.group_code
          and m.status = 'Completed'
          and ((left(m.match_id, 2) = p.slot and right(m.match_id, 2) = p.other_slot)
            or (left(m.match_id, 2) = p.other_slot and right(m.match_id, 2) = p.slot))
        limit 1
      ), 0) else 0 end as head_to_head_win
    from paired p
  ),
  unresolved as (
    select distinct x.group_code
    from metrics x
    join metrics y
      on y.group_code = x.group_code
     and y.match_wins = x.match_wins
     and y.slot > x.slot
    where x.tie_count >= 3
      and x.game_win_pct = y.game_win_pct
      and x.game_diff = y.game_diff
      and x.games_for = y.games_for
  ),
  ranked as (
    select m.*,
      row_number() over (
        partition by group_code
        order by
          match_wins desc,
          case when tie_count = 2 then head_to_head_win else 0 end desc,
          case when tie_count >= 3 then game_win_pct else 0 end desc,
          game_diff desc,
          games_for desc,
          slot asc
      ) as group_rank
    from metrics m
  )
  select
    max(team_name) filter (where group_code = 'A' and group_rank = 1),
    max(team_name) filter (where group_code = 'A' and group_rank = 2),
    max(team_name) filter (where group_code = 'B' and group_rank = 1),
    max(team_name) filter (where group_code = 'B' and group_rank = 2),
    exists(select 1 from unresolved where group_code = 'A'),
    exists(select 1 from unresolved where group_code = 'B')
  into a_rank_1, a_rank_2, b_rank_1, b_rank_2, a_random_required, b_random_required
  from ranked;

  if not a_complete then
    a_rank_1 := 'Group A · Rank 1';
    a_rank_2 := 'Group A · Rank 2';
  elsif a_random_required then
    a_rank_1 := 'Group A · Random draw required';
    a_rank_2 := 'Group A · Random draw required';
  end if;

  if not b_complete then
    b_rank_1 := 'Group B · Rank 1';
    b_rank_2 := 'Group B · Rank 2';
  elsif b_random_required then
    b_rank_1 := 'Group B · Random draw required';
    b_rank_2 := 'Group B · Random draw required';
  end if;

  update public.tournament_matches
  set team_1 = a_rank_1, team_2 = b_rank_2, updated_at = now()
  where match_id = 'SF1' and status = 'Not started'
    and (team_1, team_2) is distinct from (a_rank_1, b_rank_2);

  update public.tournament_matches
  set team_1 = b_rank_1, team_2 = a_rank_2, updated_at = now()
  where match_id = 'SF2' and status = 'Not started'
    and (team_1, team_2) is distinct from (b_rank_1, a_rank_2);

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

update public.tournament_matches
set sort_order = sort_order + 100
where match_id in ('SF1', 'SF2', 'FINAL', 'THIRD');

delete from public.tournament_matches
where stage in ('Group A', 'Group B');

insert into public.tournament_matches
  (match_id, sort_order, stage, round_number, court, scheduled_start, scheduled_end,
   team_1, team_2, team_1_set_1, team_2_set_1, team_1_set_2, team_2_set_2,
   team_1_tiebreak, team_2_tiebreak, status, winner)
values
  ('A2-A5', 1, 'Group A', 1, 2, '2026-09-19 11:00:00+09', '2026-09-19 11:20:00+09', 'SO LUCKY JO TEAM', 'RAWRR TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B2-B5', 2, 'Group B', 1, 4, '2026-09-19 11:00:00+09', '2026-09-19 11:20:00+09', 'MaFia TEAM', 'RALLÉ TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A3-A4', 3, 'Group A', 1, 2, '2026-09-19 11:20:00+09', '2026-09-19 11:40:00+09', '은아재선 TEAM', 'KILLER TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B3-B4', 4, 'Group B', 1, 4, '2026-09-19 11:20:00+09', '2026-09-19 11:40:00+09', 'TITI & DIEGO', 'JS TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A1-A5', 5, 'Group A', 2, 2, '2026-09-19 11:40:00+09', '2026-09-19 12:00:00+09', 'NOPSON TEAM', 'RAWRR TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B1-B5', 6, 'Group B', 2, 4, '2026-09-19 11:40:00+09', '2026-09-19 12:00:00+09', 'LOOFAH 🧽', 'RALLÉ TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A2-A3', 7, 'Group A', 2, 2, '2026-09-19 12:00:00+09', '2026-09-19 12:20:00+09', 'SO LUCKY JO TEAM', '은아재선 TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B2-B3', 8, 'Group B', 2, 4, '2026-09-19 12:00:00+09', '2026-09-19 12:20:00+09', 'MaFia TEAM', 'TITI & DIEGO', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A1-A4', 9, 'Group A', 3, 2, '2026-09-19 12:20:00+09', '2026-09-19 12:40:00+09', 'NOPSON TEAM', 'KILLER TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B1-B4', 10, 'Group B', 3, 4, '2026-09-19 12:20:00+09', '2026-09-19 12:40:00+09', 'LOOFAH 🧽', 'JS TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A3-A5', 11, 'Group A', 3, 2, '2026-09-19 12:40:00+09', '2026-09-19 13:00:00+09', '은아재선 TEAM', 'RAWRR TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B3-B5', 12, 'Group B', 3, 4, '2026-09-19 12:40:00+09', '2026-09-19 13:00:00+09', 'TITI & DIEGO', 'RALLÉ TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A2-A4', 13, 'Group A', 4, 2, '2026-09-19 13:00:00+09', '2026-09-19 13:20:00+09', 'SO LUCKY JO TEAM', 'KILLER TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B2-B4', 14, 'Group B', 4, 4, '2026-09-19 13:00:00+09', '2026-09-19 13:20:00+09', 'MaFia TEAM', 'JS TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A1-A3', 15, 'Group A', 4, 2, '2026-09-19 13:20:00+09', '2026-09-19 13:40:00+09', 'NOPSON TEAM', '은아재선 TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B1-B3', 16, 'Group B', 4, 4, '2026-09-19 13:20:00+09', '2026-09-19 13:40:00+09', 'LOOFAH 🧽', 'TITI & DIEGO', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A4-A5', 17, 'Group A', 5, 2, '2026-09-19 13:40:00+09', '2026-09-19 14:00:00+09', 'KILLER TEAM', 'RAWRR TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B4-B5', 18, 'Group B', 5, 4, '2026-09-19 13:40:00+09', '2026-09-19 14:00:00+09', 'JS TEAM', 'RALLÉ TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('A1-A2', 19, 'Group A', 5, 2, '2026-09-19 14:00:00+09', '2026-09-19 14:20:00+09', 'NOPSON TEAM', 'SO LUCKY JO TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null),
  ('B1-B2', 20, 'Group B', 5, 4, '2026-09-19 14:00:00+09', '2026-09-19 14:20:00+09', 'LOOFAH 🧽', 'MaFia TEAM', 0, 0, 0, 0, 0, 0, 'Not started', null)
on conflict (match_id) do update set
  sort_order = excluded.sort_order,
  stage = excluded.stage,
  round_number = excluded.round_number,
  court = excluded.court,
  scheduled_start = excluded.scheduled_start,
  scheduled_end = excluded.scheduled_end,
  team_1 = excluded.team_1,
  team_2 = excluded.team_2,
  team_1_set_1 = 0,
  team_2_set_1 = 0,
  team_1_set_2 = 0,
  team_2_set_2 = 0,
  team_1_tiebreak = 0,
  team_2_tiebreak = 0,
  status = 'Not started',
  winner = null;

update public.tournament_matches set
  sort_order = 21, court = 2,
  scheduled_start = '2026-09-19 14:40:00+09', scheduled_end = '2026-09-19 15:40:00+09',
  team_1 = 'Group A · Rank 1', team_2 = 'Group B · Rank 2',
  team_1_set_1 = 0, team_2_set_1 = 0, team_1_set_2 = 0, team_2_set_2 = 0,
  team_1_tiebreak = 0, team_2_tiebreak = 0, status = 'Not started', winner = null
where match_id = 'SF1';

update public.tournament_matches set
  sort_order = 22, court = 4,
  scheduled_start = '2026-09-19 14:40:00+09', scheduled_end = '2026-09-19 15:40:00+09',
  team_1 = 'Group B · Rank 1', team_2 = 'Group A · Rank 2',
  team_1_set_1 = 0, team_2_set_1 = 0, team_1_set_2 = 0, team_2_set_2 = 0,
  team_1_tiebreak = 0, team_2_tiebreak = 0, status = 'Not started', winner = null
where match_id = 'SF2';

update public.tournament_matches set
  sort_order = 23, court = 2,
  scheduled_start = '2026-09-19 16:00:00+09', scheduled_end = '2026-09-19 17:15:00+09',
  team_1 = 'Winner · Semifinal 1', team_2 = 'Winner · Semifinal 2',
  team_1_set_1 = 0, team_2_set_1 = 0, team_1_set_2 = 0, team_2_set_2 = 0,
  team_1_tiebreak = 0, team_2_tiebreak = 0, status = 'Not started', winner = null
where match_id = 'FINAL';

update public.tournament_matches set
  sort_order = 24, court = 4,
  scheduled_start = '2026-09-19 16:00:00+09', scheduled_end = '2026-09-19 17:15:00+09',
  team_1 = 'Loser · Semifinal 1', team_2 = 'Loser · Semifinal 2',
  team_1_set_1 = 0, team_2_set_1 = 0, team_1_set_2 = 0, team_2_set_2 = 0,
  team_1_tiebreak = 0, team_2_tiebreak = 0, status = 'Not started', winner = null
where match_id = 'THIRD';
