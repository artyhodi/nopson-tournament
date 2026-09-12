# Supabase live scores

The public website reads `public.tournament_matches` through Supabase Realtime. Visitors can read scores; they cannot insert, edit, or delete rows. Approved organizers update scores through `score-admin.html`.

The base schema lives in `supabase/migrations/20260906000000_create_tournament_matches.sql`. The current 10-team, 24-match setup and five-team ranking automation live in `supabase/migrations/20260912064438_expand_to_ten_teams.sql`.

For group matches, enter the two game scores. For knockout matches, enter both set scores and the match tiebreak if the teams split sets. Database triggers derive `status` and `winner`; do not set them manually. Once all 10 matches in each group are complete, the semifinal draw is populated automatically. Semifinal results then populate the final and third-place match.

Changes appear on the website through Realtime. Keep the secret/service-role key out of this repository and all browser code.
