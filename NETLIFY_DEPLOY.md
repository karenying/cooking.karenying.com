# Netlify deployment

- Live app: https://cooking.karenying.com
- Separate Netlify project: https://app.netlify.com/projects/karenying-cooking
- Project ID: `6cca6f8e-3152-4649-bdd3-d6f3efa5a778`
- GitHub repository: https://github.com/karenying/cooking.karenying.com
- Production branch: `main`; pushes trigger Netlify builds automatically.
- Build command: `npm run build`; publish directory: `dist` (see `netlify.toml`).

Netlify DNS manages the `cooking.karenying.com` record and HTTPS. The existing
personal website is a separate project. Do not link this checkout to it.
Local Netlify project state is stored in ignored `.netlify/`.

The cooking project has `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` configured in Netlify environment variables.
These are browser configuration, not server secrets. Never add a Supabase
service-role key or Google OAuth client secret to a `VITE_` variable. Environment
changes require a new build to reach the frontend.

Supabase Site URL and an allowed redirect URL are
`https://cooking.karenying.com/`. Local development redirects remain allowed.
The Google OAuth web client includes the JavaScript origin
`https://cooking.karenying.com`; its authorized redirect URI remains
`https://ylnsviwxkjonobnbhyji.supabase.co/auth/v1/callback`.
See [OAuth access and sessions](supabase/OAUTH_SETUP.md).

To ship updates, commit the intended source changes and push `main`. Review
build results under the cooking project's Deploys page. A failed build leaves
the last successful deployment live.
