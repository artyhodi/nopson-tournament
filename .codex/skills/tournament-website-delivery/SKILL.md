---
name: tournament-website-delivery
description: Build or materially update small tournament and event websites with static hosting, responsive public pages, live scores, authenticated administration, bracket progression, and photo galleries.
---

# Tournament Website Delivery

Ship an event-ready website whose public schedule, draws, standings, knockout progression, admin inputs, and photos remain consistent.

## Before implementation

- Freeze the event contract: teams, player display names, flags, groups, scoring, ranking rules, tiebreaks, knockout formats, courts, times, prizes, sponsors, and organizer accounts.
- Do not automate a bracket while these rules remain ambiguous.
- Establish one source of truth for tournament metadata. Avoid independently hard-coding the same teams, fixtures, or times in HTML, JavaScript, and database rows.
- Document which content is static and requires deployment versus live and backend-connected.

## Backend and security

- Derive match status and winner from score fields rather than asking scorekeepers to set them manually.
- Centralize ranking and bracket progression where possible. If frontend and backend both implement ranking, verify both against the same scenarios.
- Test two-team head-to-head ties, multi-team Game Win %, game differential, games won, unresolved ties, semifinal seeding, final participants, and third-place participants.
- Use only public or publishable keys in browser code. Never expose service-role credentials.
- Enable RLS on exposed tables and authorize writes using approved organizer identity.
- Commit durable database functions, triggers, and policies as migrations; do not leave production-only schema changes undocumented.

## Frontend and assets

- Treat narrow-mobile QA as a release gate after changes to navigation, hero images, tables, brackets, flags, or galleries.
- Require an asset specification before integration: transparent logo when needed, crop and aspect ratio, optimized display size, and retained original-resolution photos.
- Keep gallery thumbnails efficient while linking to original-resolution files.
- Preserve a read/refresh fallback when realtime connectivity is slow.

## Release checklist

- Confirm every public section agrees on teams, players, flags, groups, courts, and times.
- Verify organizer access on the devices that will be used during the event, and confirm unapproved writes fail.
- Validate code and migrations, then test the complete tournament flow.
- Check desktop and the smallest supported mobile viewport.
- Version changed CSS and JavaScript assets to avoid stale caches.
- Publish once, wait for hosting deployment, and verify the custom-domain URL rather than only local or repository previews.
- Save a test score and confirm the public result updates, then restore the intended data if necessary.
- Document the event-day fallback and avoid structural changes once play begins unless the event is blocked.

## Origin

These controls come from the Nopson Tournament website post-mortem. The main failures were repeated rule changes, duplicated tournament data, late ranking edge cases, mobile regressions, cache confusion, incomplete asset preparation, incremental authentication setup, and production schema drift.
