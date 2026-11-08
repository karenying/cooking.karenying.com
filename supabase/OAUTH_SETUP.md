# Google sign-in and shared cookbook access

## Current state

Google OAuth is enabled in the hosted Supabase project. The whole app is wrapped in `AuthGate`. A successful `cookbook_access()` result is cached as a UI startup hint for up to five minutes, capped by the current token expiry. Without a valid matching-user hint, no catalogue hooks mount until a fresh access check succeeds. Database RLS still checks the allowlist on every read and write, including during that cache window. Karen confirmed a real Google login opens the cookbook. The two requested Gmail addresses are stored as private configuration in `app_private.cookbook_allowlist`, not bundled into JavaScript or committed as seed data.

The database checks the signed-in user's confirmed Auth email and a matching **verified Google identity**, joined to the private allowlist. It does not authorize from user-editable JWT metadata. RLS checks every read and write. Both allowed users share the same cookbook; there is no separate per-user recipe/calendar partition.

## Google / Supabase settings

- Google OAuth client type: **Web application**.
- Local JavaScript origins: `http://127.0.0.1:5173` and `http://127.0.0.1:5174`.
- Google authorized redirect URI: `https://ylnsviwxkjonobnbhyji.supabase.co/auth/v1/callback`.
- Supabase Site URL: `http://127.0.0.1:5173/`.
- Supabase Redirect URLs: `http://127.0.0.1:5173/` and `http://127.0.0.1:5174/`.
- Supabase Google provider: enabled; matching client ID/secret are configured in the dashboard. Nonce checks stay enabled, and missing-email accounts are not allowed.
- If the Google consent app is in Testing, add both allowed accounts as Google test users too. Google test-user access and the database allowlist are separate checks.
- Add the cooking site's real HTTPS origin/redirect when deploying; no existing personal Netlify site was changed.

[Google setup guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)

## Sessions

The client uses PKCE with persistent sessions and automatic token refresh. Access tokens normally expire after one hour; this does **not** mean signing in every hour. Supabase sessions last indefinitely by default until sign-out, revocation or configured limits. Browser storage clearing can also require signing in again. We did not change the project's token lifetime or add session timeout limits.

The access-check hint lives under `at-home-access-check-v1` in localStorage and contains only a user ID and expiry timestamp. It stores no extra credentials or tokens, expires without sliding on reload, and clears on sign-out or a failed/denied check. Malformed, unavailable or expired storage falls back to the normal server check. Signed-in loads skip the Google-provider settings request. This speeds up reloads; it does not make the app work offline or extend Supabase sessions.

[Supabase session behavior](https://supabase.com/docs/guides/auth/sessions)

## Shared writes and drafts

Recipes, meals and trips now save through `save_cookbook_changes`, an invoker function using caller RLS and limited column grants. A logical save is transactional. Row timestamps detect stale updates/deletes and reject overwriting another device's changes. Import/source/review metadata remains protected from client reads/writes. New meals don't need a historical source-day row; imported source links are preserved.

Failures keep local draft copies, expose retry/discard controls, and block further editing until resolved. Sign-out is disabled while a write is in flight. Existing browser-only edits are **not** silently uploaded. A **Save device changes to Supabase** button can sync those after login; old storage keys remain intact.

Current backup keys:

- `at-home-recipe-cloud-drafts-v1`
- `at-home-calendar-cloud-meals-v1`
- `at-home-calendar-cloud-events-v1`

Other devices pick up shared changes on reload. Real-time subscriptions and offline background synchronization are not implemented.

## Validation

- Real Google login confirmed by Karen.
- Real allowlisted database role wrote and read a recipe, meal and trip inside a rolled-back transaction; no permanent test rows.
- Anonymous REST reads return permission denied; authenticated users outside the allowlist see no cookbook rows and cannot save.
- Local PostgreSQL-compatible tests cover both allowed accounts, outsiders, unverified Google identities, private columns, recipe/meal/trip saves and stale-write rejection.
- Mocked browser checks cover PKCE redirect, no signed-out data loads, the access gate, shared recipe/calendar writes, retry/reload and sign-out.
- Build and the repository's 15 tests pass.

The project advisor separately flags disabled leaked-password protection for password authentication. This app exposes Google sign-in only and its authorization requires a verified Google identity. If password authentication is added, address the [password-security setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) first.
