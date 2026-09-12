# Nopson Tournament

Static tournament website for 19 September 2026 at Mmove Padel, Ipark Yongsan, Seoul.

Includes an overview, two five-team group-stage draws, separate schedules for Courts 2 and 4, live standings, and an automatically populated knockout bracket.

## Run locally

No build or dependencies required. Run `python -m http.server 8000` in this folder.

## Files

- `index.html`: page shell and event overview
- `tournament-data.js`: teams, players, groups, fixtures, schedule and generated tournament sections
- `style.css`: responsive styling
- `app.js`: accessible tab navigation
- `live-scores.js`: Supabase scores, standings and knockout rendering
- `score-admin.html` / `score-admin.js`: authenticated score-entry interface
- `nopson-logo.svg`: self-contained logo

## GitHub Pages

Files are deployed from `main` and `/ (root)` at `padel.nopsoncapital.com`.

## Updates

Edit `tournament-data.js` to update teams, groups, fixtures and displayed times. Keep the matching Supabase fixture rows synchronized. Approved scorekeepers update scores through `score-admin.html`; Supabase derives winners and advances knockout participants automatically.
