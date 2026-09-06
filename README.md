# Nopson Tournament

Static tournament website for 19 September 2026 at Mmove Padel, Ipark Yongsan, Seoul.

Includes overview, qualifying groups, separate schedules for Courts 2 and 4, knockout brackets, and group results initialized to zero.

## Run locally

No build or dependencies required. Run `python -m http.server 8000` in this folder.

## Files

- `index.html`: event details, fixtures and standings
- `style.css`: responsive styling
- `app.js`: accessible tab navigation
- `nopson-logo.svg`: self-contained logo

## GitHub Pages

Files are at the root. Configure Pages to deploy from `main` and `/ (root)` when ready to publish. Hosting is not enabled by this upload.

## Updates

Edit `index.html` to update teams, times and scores. Groups are provisional, times are estimates, and results are placeholders. Scores are updated manually; there is no live scoring backend.
