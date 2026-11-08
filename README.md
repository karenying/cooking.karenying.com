# At Home

A mobile-first React + TypeScript prototype for a personal cookbook and meal calendar.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` for the production build and `npm test` for calendar and sample-data checks.

## Prototype scope

- Monthly meal calendar with full meal details on desktop and a selected-day agenda on mobile.
- Add and edit meals with freeform notes and inline recipe chips. Type 3+ characters for fuzzy recipe suggestions; click, Enter or Tab adds the highlighted recipe and sets the meal to At home. At home is the default; the other options are Eating out and Figma (work lunch).
- Add all-day away events with inclusive start/end dates, notes, editing, removal and undo. Trips can span months and stay separate from meals.
- Recipe index with search, cuisine/category filters, alphabetical/time sorting.
- Mobile cooking pages with ingredient and step checklists and optional screen wake lock.
- Add a dish with optional ingredients and instructions.
- The app opens directly into the local preview and saves data in browser localStorage. Auth and device syncing are deferred. Prepared Supabase code is retained for a future OAuth and email allowlist flow. No Google Sheets import runs automatically.
- Photos are illustrative samples hosted on Unsplash. Google Fonts supplies the display and body typefaces; both have local system fallbacks.

## Deploy to Netlify

The included `netlify.toml` configures `npm run build`, the `dist` publish directory, and the SPA fallback. Connect this repository as a separate Netlify project. The local preview works without environment variables. The prepared Supabase integration is currently disconnected from the app flow.

## Next

When resuming cloud integration, implement OAuth and an email allowlist enforced by database policies. Recipe attachments and the spreadsheet import remain separate future steps, retaining original text and screenshots. Cook attribution, first-time flags, and statistics are deferred.

## Supabase catalogue

The approved Menu catalogue is now imported into Supabase: 112 dishes, including 53 without recipes, with cuisines and original-source links. The app reads recipe content live through public read-only access. Calendar data and new dishes remain browser-local while OAuth/allowlist integration and authenticated writes are deferred. See [database state and next steps](supabase/README.md). No calendar import or deployment has run.

The app now reads recipe content live from Supabase (public read-only for now). New dishes, meals and away events remain local. The calendar import is staged for uncertainty-first review at `/outputs/calendar-migration/review.html`; no calendar records have been imported yet.

The calendar now reads imported meals and away events live from Supabase as well. It includes 822 meals and 87 away events, with the reviewed corrections and no future source entries. Reads are public for now; calendar edits and newly added dishes remain local until authenticated writes are implemented. Original browser calendar data remains preserved under its old storage keys.

## Google sign-in

The app now requires an allowlisted Google account before loading any cookbook data. Recipes, meals and trips save to the shared Supabase database. Failed saves retain local backups and support retry. Previous browser-only edits can be synced explicitly after login. See [OAuth setup and session behavior](supabase/OAUTH_SETUP.md). This supersedes the earlier public-read/local-edit prototype notes.
