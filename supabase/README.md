# Supabase cookbook database

## Current access — November 8, 2026

Google sign-in now blocks the whole app. Only the two configured, verified Google accounts in the private database allowlist can read or write the shared cookbook. Earlier public-read policies and anonymous grants have been removed. Recipes, meals and trips save to Supabase; import/source/review metadata remains restricted. See [OAuth configuration and validation](OAUTH_SETUP.md).

Live migrations:

- `20261108083203_create_private_recipe_catalogue`
- `20261108083844_allow_public_recipe_reads` (historical, superseded)
- `20261108091129_create_calendar_catalogue`
- `20261108091237_allow_public_calendar_reads` (historical, superseded)
- `20261108180055_google_allowlist_and_authenticated_writes`
- `20261108180410_document_private_allowlist_policy`

Imported data: 112 recipes/dishes (53 without recipes), 599 source days, 822 meals and 87 trips. Original attachments remain local, with links and hashes in database provenance. Subsequent user edits may change these counts.

The app maps snake_case database columns to its existing models and sends authenticated requests through the Supabase client. OAuth uses the publishable key only; the Google client secret stays in the provider dashboard. `src/Connection.tsx` is a legacy, unmounted implementation and should not be enabled. Its unapplied SQL draft is archived outside active migrations.

Existing device-only changes remain in backup storage until explicitly synced through the app. Saves use per-row timestamps and reject stale writes. All allowlisted users share the same records. No service-role key is exposed in the frontend, and no existing Netlify site was altered.

## Earlier catalogue import notes (historical)


## Current app access — November 8, 2026

The app now reads all 112 recipes live from Supabase. Karen authorized public **read-only** recipe content while OAuth is deferred. `20261108083844_allow_public_recipe_reads.sql` grants SELECT on explicitly listed recipe-content columns; writes, original import/review metadata and recipe_imports remain restricted. Anonymous recipe queries succeed, while metadata reads and SELECT * fail. Security advisors returned no findings.

Favorites and new dishes are browser-local overlays. Calendar meals and away events still use the existing browser keys; the import preview has not written calendar data. The future OAuth allowlist should include `karenying7@gmail.com`, and must be enforced by database policies. No provider/allowlist was configured yet.

The older import baseline below remains historical; its statements that reads are closed and the frontend is local-only are superseded by this update.


## Live state — November 8, 2026

Project: `cooking.karenying.com` (`ylnsviwxkjonobnbhyji`). The Supabase MCP connection was used to apply `migrations/20261108083203_create_private_recipe_catalogue.sql` and import the approved Menu catalogue.

- `public.recipes`: **112 dishes**, including **53 with no ingredients or instructions**. All records have a cuisine and original-source URL. Cuisines are marked inferred.
- `public.recipe_imports`: one audited import (`menu-2026-11-08`), with the source URL, export SHA-256, count and approval/storage metadata.
- Both tables have RLS enabled. Recipe content is now publicly readable through explicit column grants and a SELECT policy, as authorized by Karen. Import/review metadata and all client writes remain denied. The app reads the live recipe catalogue; calendar data remains browser-local. OAuth/allowlist and cookbook ownership remain deferred.
- The two confirmed adaptations are retained: 2 tbsp peanut butter for the gochujang noodles and 1 lb ground chicken for pad gra pow. The pepper recipe from the supplied PDF is included.
- Original screenshots and PDFs are retained in Git-ignored `outputs/recipe-migration/`. Database provenance includes links/text and image hashes, MIME types and byte counts, **not uploaded image bytes**. Private Storage upload is separate future work.

[Open the recipes table](https://supabase.com/dashboard/project/ylnsviwxkjonobnbhyji/editor)

## Verification

The live database has 112 rows, 53 without recipe content, 112 cuisines and 112 source links. Its complete recipe-content checksum matches an independently executed local PostgreSQL-compatible import (`e2f390643bf32d387c32aaa3cfae3deb`). Substitution and pepper-method checks passed. Security advisors returned no findings. After the public-read migration, anonymous REST requests for recipe columns return all 112 records. Requests for `source_provenance`, `review_notes` or `*` still return permission denied. Client INSERT/UPDATE/DELETE privileges are absent; security advisors remain clean. A new category/cuisine index is currently unused, as expected before app integration; [advisor details](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

The local import guard rejects an import into a nonempty catalogue, so rerunning does not overwrite later edits. SQL and records are in `outputs/recipe-migration/catalogue-import.sql` and `db-rows.json`; these contain personal recipe data and are ignored by Git. Do not paste the data into committed migration files.

## Mapping to the app

The live schema has explicit columns, rather than the original draft's whole-recipe JSON model:

| App field | Database column |
| --- | --- |
| `originalSource` | `original_source` |
| `cuisineInferred` | `cuisine_inferred` |
| `time` | `preparation_minutes` |
| `ingredients`, `steps` | ordered JSON arrays with the same shape |
| Other recipe content | same-name columns (`name`, `category`, `cuisine`, etc.) |

`source_provenance`, `review_notes`, `approval_basis` and `import_batch_id` retain migration context. Approval in chat does not claim every source was individually checked or invent answers to old review questions.

`src/recipe-catalogue.ts` maps these columns to the app. `src/useRecipeCatalogue.ts` uses the public REST API to load only the permitted columns, with paging, cancellation, loading/error status and retry. Recipe data is refreshed on page reload. Favorites and newly added dishes are local overlays until authenticated writes are implemented. `src/Connection.tsx` remains unmounted; it assumes the archived per-owner dishes/meals schema and should not be enabled.

## Credentials and historical drafts

The project URL and publishable key remain in ignored `.env.local`; `.env.example` documents the names. Never put a secret or service-role key in a `VITE_` variable. Public read-only recipe access was explicitly authorized for now. When enabling OAuth with an allowlist, replace `recipes_public_read` with the appropriate authorization policy before claiming recipes are private again.

`archive/legacy-owner-cookbook.sql` is the earlier per-owner email/password schema draft. It has **not** been applied and is archived outside active migrations. Its prior email/password setup instructions are superseded by the deferred OAuth/allowlist decision. Meals, ordered meal content, meal settings, away events and calendar history have not been migrated.

## Public recipe reads / local calendar

`20261108083844_allow_public_recipe_reads.sql` is applied remotely. It grants SELECT only on recipe-content columns to `anon`/`authenticated`. It does not expose migration provenance or grant any writes. The app deliberately does not query meals, trips, imports or any other table.

Existing local meals, ordered text/chips and away events use their original localStorage keys. Legacy sample recipe IDs resolve to the imported records for display/history; they are not automatically rewritten in stored meals. Original browser recipes remain under their old key. Custom local dishes are carried into the local drafts overlay; no prototype data is uploaded.

## Live calendar — November 8, 2026

Calendar import and app reads are now implemented. `calendar_days` holds 599 source-day rows; `calendar_meals` holds 822 entries with local SQL dates, Lunch/Dinner labels, home/out/Figma settings and recipe IDs; `away_events` holds 87 inclusive date ranges. NYC was corrected to March 9–22, 2025 per Karen, and six future source entries were excluded. `source_record` preserves original text/colors/links and review context but is not granted to public clients.

Migrations `20261108091129_create_calendar_catalogue` and `20261108091237_allow_public_calendar_reads` are applied. Explicit read grants and RLS policies expose only app content, with no client inserts, updates or deletes. The app pages meals/events directly from Supabase and retains edits/deletions/additions in local browser overlays until OAuth writes exist. Old local calendar keys are preserved, not reset or uploaded. Imported data, verified row counts and reviewed notes are in ignored `outputs/calendar-migration/`.
