# Beta accounts and cloud saves

The beta source now contains the account and sync implementation. **Accounts remain
disabled** in `account-config.js` until real database authorization and email-code
delivery checks pass. No live game files or deployed database schema were changed
by this increment. GitHub Pages remains the static host.

## Current service state

- Dedicated beta project: `dpxkbhuvhansozshyuvo`,
  `https://dpxkbhuvhansozshyuvo.supabase.co`.
- User confirmed `backend/supabase.sql` ran successfully.
- Network verified on November 13, 2026: the project auth health endpoint returned
  HTTP 401 with `No API key found in request`, establishing HTTPS reachability.
  The current environment policy allows the project and `api.supabase.com`.
- The previous notes said the public key had been provided, but its value is not
  in this checkout or the current runtime bindings. `publishableKey` remains empty.
  Set only the **publishable/anon client key**; never a service-role key or password.
- No authenticated remote tests have been run in this increment. Successful SQL
  execution alone does not establish row-level security or mail delivery.

## Implemented behavior

`accounts.js` uses the official, vendored Supabase JS client for email-code sign-in,
persisted sessions, refresh, and local sign-out. Auth storage uses the same isolated
namespace as the local village collections. Requests capture a token only after
checking its account identity, preventing queued work from using another user's
session after an account switch.

`cloud-sync.js` serializes refreshes and revision-checked writes. Edits persist
locally before debounced upload. Every acknowledgement includes the sent local
revision so new edits remain dirty. Sign-in, opening the app, focus, visibility and
reconnect refresh clean copies; dirty copies remain local during failures.
Late responses from stopped queues cannot change another account's collection/UI.

Guest villages never upload on sign-in. The player explicitly copies the selected
guest village into an account slot. Sign-out restores the guest collection; each
account retains its separate offline cache. Sign-out does not erase cached account
data from the browser; the UI discloses this for shared-device users.

Conflicts persist both the local copy and the latest remote snapshot across reload.
The player chooses local, cloud (including cloud deletion), or copies local to a
free slot before accepting cloud. Subsequent remote changes are checked again.
Deletes require a successful revision-checked remote request before removing the
local copy; offline deletion is not queued. Edits made during deletion survive as
a conflict. Other errors preserve local villages and exports remain available.

Account deletion is **not implemented or exposed**: it requires a verified managed
backend endpoint that deletes the authenticated auth user and cascades cloud rows.
Do not present local sign-out as account deletion.

## Finish configuration and verification

1. Add the public client key to `account-config.js`; leave `enabled:false` until
   the checks below pass. Use a separate project/configuration before live promotion.
2. Configure managed email auth and delivery. The email template must include
   `{{ .Token }}` for the code flow. Supabase's default mail service restricts
   recipients; configure suitable SMTP before opening sign-up to arbitrary players.
3. Use two dedicated **empty beta test accounts** and their short-lived access
   tokens to run `node scripts/check-supabase.mjs`. Supply `STILLWATER_PUBLIC_KEY`,
   `STILLWATER_TEST_TOKEN_A`, and `STILLWATER_TEST_TOKEN_B` through the environment,
   never chat or committed files. The script verifies anonymous denial, cross-user
   reads/writes/deletes, ownership injection, concurrent fourth-slot rejection,
   stale writes/deletes, and cleans only its own generated fixtures.
4. Verify actual code delivery/sign-in and expired-session recovery in a browser.
   Exercise two devices, offline/reconnect, another-account login, slot switches
   during sync, conflicts, and sign-out with pending changes. Confirm beta storage
   keys and cloud `environment=beta`; no live storage or project access.
5. Only after those checks, set `enabled:true` and follow `AGENTS.md` for beta
   publication. Do not promote to live without explicit approval.

## Local validation

- `npm run check` and `npm test` (66 tests at this increment).
- Run `PORT=5193 npm start`, then `scripts/check-villages.mjs` and
  `scripts/check-accounts.mjs` with `PLAYWRIGHT_MODULE` set to an available
  Playwright module path if needed. `STILLWATER_URL` and `CHROMIUM_PATH` are optional.
- The account browser check uses the shipped official SDK with mocked HTTP and
  test-only configuration. It does **not** verify Supabase authorization or email.
- Account config, account/sync modules and the vendored SDK are included by
  `scripts/stage-beta.mjs`; the staging script isolates the app's storage namespace.

## Vendored SDK

`vendor/supabase.js` bundles `@supabase/supabase-js` 2.90.1 and its pinned dependency
graph with esbuild 0.25.12. License: `vendor/supabase.LICENSE`. Build inputs are
recorded in `backend/sdk-package-lock.json`. To reproduce without runtime/CDN imports:

```sh
mkdir -p /tmp/stillwater-sdk
cp backend/sdk-package.json /tmp/stillwater-sdk/package.json
cp backend/sdk-package-lock.json /tmp/stillwater-sdk/package-lock.json
npm ci --prefix /tmp/stillwater-sdk --cache /tmp/stillwater-npm-cache
/tmp/stillwater-sdk/node_modules/.bin/esbuild /tmp/stillwater-sdk/node_modules/@supabase/supabase-js/dist/index.mjs --bundle --format=esm --platform=browser --minify --legal-comments=eof --outfile=vendor/supabase.js
```
