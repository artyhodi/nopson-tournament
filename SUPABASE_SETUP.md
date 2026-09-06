# Supabase live scores

The public website reads `public.tournament_matches` through Supabase Realtime. Visitors can read scores; they cannot insert, edit, or delete rows. Tournament organizers update scores in the Supabase Table Editor.

The schema and 16 starting fixtures live in `supabase/migrations/20260906000000_create_tournament_matches.sql`.

Open **Table Editor → tournament_matches** to enter scores. For group matches, edit the two `set_1` columns. For knockout matches, also use `set_2` and the tiebreak columns. Set `status` to `Live` while a match is running, then `Completed` and choose winner `1` or `2`.

Changes appear on the website through Realtime. Keep the secret/service-role key out of this repository and all browser code.
