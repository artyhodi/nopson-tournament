alter table public.tournament_matches
  add column if not exists team_1_set_3 smallint not null default 0 check (team_1_set_3 >= 0),
  add column if not exists team_2_set_3 smallint not null default 0 check (team_2_set_3 >= 0);

create or replace function public.derive_match_outcome()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  team_1_sets integer := 0;
  team_2_sets integer := 0;
  has_score boolean;
begin
  has_score :=
    coalesce(new.team_1_set_1, 0) <> 0 or coalesce(new.team_2_set_1, 0) <> 0 or
    coalesce(new.team_1_set_2, 0) <> 0 or coalesce(new.team_2_set_2, 0) <> 0 or
    coalesce(new.team_1_set_3, 0) <> 0 or coalesce(new.team_2_set_3, 0) <> 0;

  new.winner := null;
  new.status := case when has_score then 'Live' else 'Not started' end;

  if new.stage in ('Group A', 'Group B', 'Semifinal', 'Third place') then
    if new.team_1_set_1 > new.team_2_set_1 then
      new.winner := 1;
      new.status := 'Completed';
    elsif new.team_2_set_1 > new.team_1_set_1 then
      new.winner := 2;
      new.status := 'Completed';
    end if;
  elsif new.stage = 'Final' then
    if new.team_1_set_1 > new.team_2_set_1 then
      team_1_sets := team_1_sets + 1;
    elsif new.team_2_set_1 > new.team_1_set_1 then
      team_2_sets := team_2_sets + 1;
    end if;

    if new.team_1_set_2 > new.team_2_set_2 then
      team_1_sets := team_1_sets + 1;
    elsif new.team_2_set_2 > new.team_1_set_2 then
      team_2_sets := team_2_sets + 1;
    end if;

    if new.team_1_set_3 > new.team_2_set_3 then
      team_1_sets := team_1_sets + 1;
    elsif new.team_2_set_3 > new.team_1_set_3 then
      team_2_sets := team_2_sets + 1;
    end if;

    if team_1_sets >= 2 then
      new.winner := 1;
      new.status := 'Completed';
    elsif team_2_sets >= 2 then
      new.winner := 2;
      new.status := 'Completed';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

update public.tournament_matches
set
  team_1_set_2 = 0,
  team_2_set_2 = 0,
  team_1_set_3 = 0,
  team_2_set_3 = 0,
  team_1_tiebreak = 0,
  team_2_tiebreak = 0,
  status = 'Not started',
  winner = null
where match_id in ('SF1', 'SF2', 'FINAL', 'THIRD');
