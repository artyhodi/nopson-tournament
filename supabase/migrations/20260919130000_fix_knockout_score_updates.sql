-- Keep automatic knockout participant updates privileged without granting
-- scorekeepers permission to edit team names directly.
create or replace function private.sync_final_and_third_place()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  semifinal_1 public.tournament_matches%rowtype;
  semifinal_2 public.tournament_matches%rowtype;
  final_team_1 text := 'Winner · Semifinal 1';
  final_team_2 text := 'Winner · Semifinal 2';
  third_team_1 text := 'Loser · Semifinal 1';
  third_team_2 text := 'Loser · Semifinal 2';
begin
  if (case when tg_op = 'DELETE' then old.match_id else new.match_id end) not in ('SF1', 'SF2') then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select * into semifinal_1
  from public.tournament_matches
  where match_id = 'SF1';

  select * into semifinal_2
  from public.tournament_matches
  where match_id = 'SF2';

  if semifinal_1.status = 'Completed' and semifinal_1.winner in (1, 2) then
    final_team_1 := case semifinal_1.winner when 1 then semifinal_1.team_1 else semifinal_1.team_2 end;
    third_team_1 := case semifinal_1.winner when 1 then semifinal_1.team_2 else semifinal_1.team_1 end;
  end if;

  if semifinal_2.status = 'Completed' and semifinal_2.winner in (1, 2) then
    final_team_2 := case semifinal_2.winner when 1 then semifinal_2.team_1 else semifinal_2.team_2 end;
    third_team_2 := case semifinal_2.winner when 1 then semifinal_2.team_2 else semifinal_2.team_1 end;
  end if;

  update public.tournament_matches
  set team_1 = final_team_1,
      team_2 = final_team_2,
      updated_at = now()
  where match_id = 'FINAL'
    and status = 'Not started'
    and (team_1, team_2) is distinct from (final_team_1, final_team_2);

  update public.tournament_matches
  set team_1 = third_team_1,
      team_2 = third_team_2,
      updated_at = now()
  where match_id = 'THIRD'
    and status = 'Not started'
    and (team_1, team_2) is distinct from (third_team_1, third_team_2);

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function private.sync_final_and_third_place() from public;

drop trigger if exists sync_final_and_third_after_semifinal_change
on public.tournament_matches;

create trigger sync_final_and_third_after_semifinal_change
after insert or delete or update on public.tournament_matches
for each row execute function private.sync_final_and_third_place();

drop function if exists public.sync_final_and_third_place();

-- A direct Set 3 edit must also recalculate the Final outcome.
drop trigger if exists derive_match_outcome_before_score_change
on public.tournament_matches;

create trigger derive_match_outcome_before_score_change
before insert or update of
  team_1_set_1, team_2_set_1,
  team_1_set_2, team_2_set_2,
  team_1_set_3, team_2_set_3,
  team_1_tiebreak, team_2_tiebreak
on public.tournament_matches
for each row execute function public.derive_match_outcome();
