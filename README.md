# At Home

A personal cookbook and meal calendar built with React 19, TypeScript and Vite 7. Recipe pages are mobile first, while the desktop calendar keeps full meal details visible.

[Open the app](https://cooking.karenying.com) · [GitHub repository](https://github.com/karenying/cooking.karenying.com)

The app requires an approved Google account. Recipes, meals and trips are shared through Supabase; the recipe catalogue and historical calendar have been imported from the original spreadsheet. The main app uses the real catalogue, with no sample recipes or automatic spreadsheet synchronization.

## Current features

### Calendar

- Monthly calendar with full meal details on desktop and a selected-day agenda on mobile.
- Add and edit lunch and dinner with freeform text and inline recipe chips, preserving their order and line breaks.
- Type three or more characters for fuzzy recipe suggestions; click, Enter or Tab inserts the highlighted recipe and sets the meal to At home.
- At home, Eating out and Figma meal settings, plus a per-meal **Vic cooked** toggle.
- Away/vacation events with inclusive start and end dates, notes, editing, removal and undo. Trips can span months and remain separate from meals.
- Meal removal with undo, lunch/dinner filters, and keyboard shortcuts: Left/Right for adjacent months and `t` for Today, when not typing or using a dialog.

### Recipes

- Search names, cuisines, categories and ingredients, with name matches ranked first.
- Category and cuisine filters; default sorting by historical home-meal popularity, plus A–Z, Z–A and Quickest.
- Add dishes with optional recipe content; edit names, categories, cuisines, grouped ingredients, ordered instructions, source links and notes. The recipe edit action is currently available in the desktop recipe toolbar.
- Mobile cooking pages with ingredient checkboxes, numbered instructions, original-source links, notes and calendar history. Dishes without ingredients or instructions remain usable.
- Optional **Keep screen on** toggle where the browser supports screen wake lock. Ingredient checkmarks are temporary and reset when leaving a recipe.

### Analytics

- All time, This month and individual calendar-year filters; future plans are excluded.
- Meal counts and shares for At home, Ate out, Figma and Away, with Vic's explicitly flagged home meals shown as a subset.
- Home-meal days, longest consecutive home streak with start/end dates, distinct linked dishes and cuisines, most logged dishes and cuisine rankings.
- Two meal slots per recorded date: missing lunch/dinner slots count as home/leftovers, away events override both slots, and entirely unrecorded dates are excluded. Duplicate records do not inflate the meal breakdown; different settings in one slot split its share. Dish and cuisine rankings use recorded, linked home meals.

## Run locally

Use Node.js 22.18+ and pnpm. The repository includes `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Fill in `.env.local` with the intended Supabase project's browser configuration:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Then start Vite:

```sh
pnpm dev
```

Open the URL printed by Vite, usually `http://127.0.0.1:5173`. A configured Supabase project, Google provider, allowed local redirect URL and database-allowlisted Google account are required to use the cookbook. There is no unauthenticated local preview mode.

`.env.local` is ignored by Git. Use only the publishable client key in frontend configuration; never put a service-role key or Google OAuth client secret in a `VITE_` variable. See [OAuth setup and session behavior](supabase/OAUTH_SETUP.md) for access configuration and [deployment configuration](NETLIFY_DEPLOY.md) for production URLs.

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local Vite server |
| `pnpm build` | Run TypeScript checks and build into `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm test` | Run Node unit tests for calendar logic, catalogue mapping, recipe search, analytics and access caching |

The test runner uses Node's TypeScript stripping. Tests use fixtures and do not require live database credentials. Google Fonts supplies the app's typefaces, with system-font fallbacks.

## Data and saving

Supabase is the source of truth. Google sign-in and a private database allowlist protect the shared cookbook; row-level security enforces access on reads and writes. Both approved accounts use the same records.

Saves are transactional and use row timestamps to reject stale updates from another device. Pending saves show a **Saving…** toast. Failed saves retain browser-local drafts and expose retry/discard controls; further editing is blocked until the failure is resolved. Previous device-only edits are uploaded only through the explicit **Save device changes** action.

Other devices see shared changes on reload. Real-time updates and offline background synchronization are not implemented. Original import screenshots and audit files remain in ignored local `outputs/` directories; attachment uploads and a general photo/source-management flow are not implemented. Preserve existing import provenance and later edits rather than rerunning old imports.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | App shell, hash routing, calendar, recipe browsing and day/away editors |
| `src/AuthGate.tsx`, `src/auth-access-cache.ts` | Google sign-in, cookbook access checks and startup access hint |
| `src/supabase.ts`, `src/useCloudItems.ts` | Supabase client, shared saves, conflict handling and local draft recovery |
| `src/useRecipeCatalogue.ts`, `src/useCalendarCatalogue.ts` | Catalogue loading and app state |
| `src/recipe-catalogue.ts`, `src/calendar-catalogue.ts` | Database/model mapping and legacy ID compatibility |
| `src/MealEntryEditor.tsx`, `src/RecipeEditDialog.tsx` | Inline meal content and recipe editing |
| `src/analytics.ts`, `src/AnalyticsPage.tsx` | Analytics calculations and UI |
| `src/styles.css`, `src/editorial.css`, `src/analytics.css` | Responsive styling |
| `supabase/migrations/` | Schema and access-policy migration history |
| `tests/` | Unit tests |

`src/Connection.tsx` contains a legacy, unmounted connection UI; its store type is still referenced by the app. The active flow uses `AuthGate` and the catalogue hooks. The separate local [migration review tool](migration-review.md) is retained for source review and is not part of the normal production build; its earlier import-status notes are historical.

## Deployment

The app has a dedicated Netlify project at [karenying-cooking](https://app.netlify.com/projects/karenying-cooking), serving [cooking.karenying.com](https://cooking.karenying.com). Pushes to `main` trigger production builds. `netlify.toml` defines `npm run build`, the `dist` publish directory and the SPA fallback; navigation uses URL hashes.

See [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md) for environment variables and OAuth redirect configuration. Keep this checkout linked to the cooking project; Karen's existing personal website is a separate Netlify project.
