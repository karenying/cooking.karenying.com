# At Home

A mobile-first React + TypeScript prototype for a personal cookbook and meal calendar.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` for the production build.

## Prototype scope

- Monthly meal calendar with full meal details on desktop and a selected-day agenda on mobile.
- Add, edit, remove, and undo removal of meals. Multiple dishes per meal and optional freeform notes.
- Recipe index with search, cuisine/category filters, alphabetical/time sorting, and favorites.
- Mobile cooking pages with ingredient and step checklists and optional screen wake lock.
- Add a dish with optional ingredients and instructions.
- Placeholder data is saved in browser localStorage. Data does not sync between browsers or devices. No Supabase connection or Google Sheets import yet.
- Photos are illustrative samples hosted on Unsplash. Google Fonts supplies the display and body typefaces; both have local system fallbacks.

## Deploy to Netlify

The included `netlify.toml` configures `npm run build`, the `dist` publish directory, and the SPA fallback. Connect this repository as a separate Netlify project. No environment variables are required for the prototype.

## Next

Connect Supabase for authentication, relational data, and private recipe attachments. Then migrate the sheet, retaining original text and screenshots. Cook attribution, first-time flags, and statistics are deferred.
