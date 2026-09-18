alter function public.sync_semifinal_draw() set schema private;
alter function private.sync_semifinal_draw() security definer;
alter function private.sync_semifinal_draw() set search_path to 'public', 'pg_temp';

revoke all on function private.sync_semifinal_draw() from public, anon, authenticated;
