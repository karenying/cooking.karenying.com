# Temporary recipe migration review

Run the usual Vite dev server and open **`/migration-review.html`** (for example `http://127.0.0.1:5173/migration-review.html`). This separate desktop tool is only served during local development; the normal production build still includes only the cookbook. It makes no Supabase calls and does not import the main app or its localStorage keys.

1. **Try an example** to see the workflow. It contains explicitly fictional content; approved export is disabled for example batches.
2. **Load review JSON** to open a prepared extraction batch or restore a downloaded backup. Screenshot data can be embedded, or attached using the source panel. Linked recipes open in a separate tab; this tool does not fetch or scrape them.
3. Compare the sources and draft side by side. Edit ingredients, ingredient groups, steps and other fields. Answer flagged questions, including a note when information remains unknown. Missing instructions can remain empty.
4. Check that you reviewed the source, then **Approve recipe**, or **Leave for later**. Editing an approved recipe resets it to pending and clears the source check.
5. **Download backup** saves all items, edits, sources and decisions. **Export approved** includes only approved items in the same JSON structure. Neither button writes to the cookbook or database; a separate importer will consume the approved file later.

Progress autosaves separately under `at-home-migration-review-v1` in this browser. Large screenshots can exceed browser storage; a visible warning asks you to download a backup. Keep batches small and download a backup before switching browsers. Loading another batch asks before replacing the current one.

## Prepared Menu recipes — November 8, 2026

The local tool reads a prepared-batch manifest from `outputs/recipe-migration/batches/index.json`. It opens the website batch automatically only when no real review is already saved (or when the saved batch is the example). Use **Prepared Menu batches → Load prepared batch** to open another batch. Existing reviews are not silently overwritten.

There are 59 linked Menu entries: 43 website/PDF entries (42 extracted drafts and 1 waiting for recipe content) and 16 screenshot drafts across four smaller batches. Originals and extraction outputs live under the Git-ignored `outputs/recipe-migration/` directory. This data stays on this computer and is not included in the main app's production build. The snapshot retains exact Menu cell references, original links and original screenshot bytes. All recipes start pending.

Karen confirmed two adaptations: gochujang peanut noodles use **2 tbsp peanut butter instead of sesame paste**, and pad gra pow uses **1 lb (450 g) ground chicken instead of pork**. These changes are in the draft and recorded separately from the source. The pepper-pasta website URL is also confirmed.

**Download a backup before switching batches**; only the current batch is saved in browser storage. Keep approved exports for each batch for the later importer. See `outputs/recipe-migration/needs-source.md` for the three incomplete web sources and optional missing screenshot details. No Supabase writes or cookbook imports have run.

## Batch format

A batch is `{ version: 1, id, title, demo: false, items: [...] }`.

Each item contains:

- `id`: stable review/source identifier, unique in the batch.
- `recipe`: the app's complete `Recipe` shape from `src/data.ts`. Keep unavailable strings empty, time `0` if unknown, and missing ingredients/steps as empty arrays. Recipe IDs must also be unique.
- `sources`: `{ id, label, url?, image?, text? }[]`. URLs must be HTTP(S). Images must be embedded base64 PNG/JPEG/WebP/GIF data URLs; this keeps downloaded backups self-contained. Preserve source tab/cell attribution in the label/text.
- `questions`: `{ id, text, resolution }[]`, with initially empty resolutions.
- `status`: `pending`, `approved`, or `later`.
- `sourceChecked`: initially `false`.

For a complete JSON example, click **Try an example → Download backup**. Real extraction batches must have `demo: false`. Approved exports retain stable IDs, source material and review resolutions for the future importer. No real recipes have been extracted or imported by building this tool.

## Cleanup

After migration, delete `migration-review.html`, `src/migration-review/`, and this document. No main-app navigation or production build configuration needs changing. Export a backup before removing browser review storage.

## Source field and updated eggplant drafts

Recipes support `originalSource?: string`, a primary website or sheet-tab URL. All 59 prepared migration recipes populate it, including the three user-selected replacement/canonical URLs. The review form lets you inspect/edit it; approval blocks non-HTTP(S) values. Older backups without the field infer it from retained source provenance. Normal recipe pages show an Original source link when present. Supabase’s existing full JSON save/load retains this field as `dishes.content.originalSource`.

The cold-eggplant PDF was translated into the draft, with original Chinese text and rendered pages attached; its unspecified spoon size is a review question. `outputs/recipe-migration/cold-eggplant-translation.md` has the English translation. Yuxiang eggplant now uses the Woks of Life URL Karen selected. The confirmed pepper-pasta page remains accessible but exposes no written recipe in the retrieved/rendered post.

Reload **Menu · website recipes** using Load prepared batch to see updated drafts. Download a backup first if you have already made review edits; loading a batch replaces only the review copy, not cookbook data.

## Full catalogue export

The completed prepared catalogue contains 112 Menu dishes (59 linked entries and 53 dishes without recipes). All have original-source URLs and editable cuisine labels marked as inferred. The pepper PDF supplied by Karen provides the formerly missing recipe content.

Karen authorized accepting and exporting the prepared data as-is in chat. Prepared review items use `chatApproved: true` with `sourceChecked: false`; unresolved notes remain visible without pretending that they were answered. Editing clears chat approval for that copy. **Export full approved migration** merges all prepared batches with the active browser copy, preserving its edits and excluding explicit later deferrals, then downloads one JSON. Browser storage still holds only the active review batch; older batch edits require downloaded backups.

The as-is local export is `outputs/recipe-migration/approved-menu-export.json` (all review provenance) and `recipes-for-import.json` (112 recipe records). No export button writes to Supabase. Database schema application, ownership/auth configuration and actual import remain separate, pending work.
