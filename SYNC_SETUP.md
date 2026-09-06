# Connect Notion score syncing

The site reads public score data from `scores.json` in the `main` branch. The GitHub Actions workflow privately reads Notion and updates that file approximately every five minutes. The open website checks for new data every 30 seconds. GitHub scheduling and caching can add delays; this is not instant point-by-point scoring.

## One-time setup

1. Create an internal Notion integration at https://www.notion.so/profile/integrations for the workspace containing the tournament database. Grant **Read content** only.
2. Open https://app.notion.com/p/61769c753a77411596576fb90afa3577. Use its Connections menu to add that integration (or grant the database through the integration's access settings).
3. Copy the integration secret into a GitHub Actions repository secret named **NOTION_TOKEN** at https://github.com/artyhodi/nopson-tournament/settings/secrets/actions. Do not put it in source code, Notion notes, chat, or a repository variable.
4. Open Actions → **Sync Notion scores** → **Run workflow**. Confirm that the Read scores and Publish score data steps succeed; the connection check alone is not proof of a sync.
5. Open the website's Results tab. It should show a Last Notion sync timestamp.

## Scoring

- Qualifying uses S1 Team 1 and S1 Team 2 as games won. S2 and TB are unused.
- Knockouts use S1 and S2 for games, and TB for the deciding tiebreak points.
- Set Status to Live during play. Select Winner (Team 1 or Team 2) before changing Status to Completed.
- Match and game totals count completed group matches only. Round score badges can show live scores.
- Qualifier selection is manual because group-ranking tie rules are not confirmed. Replace the Team 1 / Team 2 placeholders in SF1, SF2, FINAL and THIRD with the actual names when known. Bracket labels update from those fields.
- Keep Match ID unchanged. The exporter requires exactly the existing 16 IDs and never publishes Notion notes, page IDs, tokens, or private player fields.
- Website rows remain in team-slot order, not automatic ranking order.

## Troubleshooting

Missing token: add NOTION_TOKEN. A 401/403/404 from Notion usually means the token or database access needs checking. On a failed export, the previous score file is preserved. Invalid or missing match rows must be corrected in Notion before syncing can resume.

The workflow uses GitHub's built-in token with contents-write permission. If repository policy prevents commits, allow that workflow permission or ask a repository admin. Branch protections remain enforced; do not bypass them.

## After the event

Disable **Sync Notion scores** in Actions when ongoing syncing is no longer needed. The final exported scores remain available on the public website.
