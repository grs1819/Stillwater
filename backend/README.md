# Beta accounts and cloud saves

Beta accounts are enabled in `account-config.js` after real password registration,
session, authorization and conflict checks. GitHub Pages remains the static host.
The live game is not promoted by this increment.

## Current service state

- Dedicated beta project: `dpxkbhuvhansozshyuvo`,
  `https://dpxkbhuvhansozshyuvo.supabase.co`.
- User confirmed `backend/supabase.sql` ran successfully.
- Network verified on November 13, 2026: the project auth health endpoint returned
  HTTP 401 with `No API key found in request`, establishing HTTPS reachability.
  The current environment policy allows the project and `api.supabase.com`.
- The provided public publishable key is now configured in `account-config.js`.
  No service-role key or database password is needed by the frontend.
- Required auth settings: **Enable Email provider ON**, **Confirm email OFF**.
  These are separate toggles. Turning off the Email provider disables password
  registration too. The public `/auth/v1/settings` endpoint reports their state.
- Latest public settings check: `mailer_autoconfirm:true`, `external.email:true`.
  Real registration without confirmation, password login and refresh passed for
  two dedicated test accounts. No emails were sent by these tests.
- A real mobile browser run also passed password login, explicit guest copying,
  cloud writes, offline/reconnect, forced session expiry/refresh, revision-checked
  deletion, logout, and another account's isolated empty collection.
- User applied `backend/conflict-http-status.sql`. Real conflict requests now
  return `PT409` promptly, including stale saves/deletes and unauthorized attempts
  to mutate another account's village. The client accepts both old and new codes.
- The full real two-user database check passed: anonymous access denied, cross-user
  reads/writes/deletes rejected, owner injection/direct inserts rejected, concurrent
  fourth slot rejected, valid revision advancement, stale saves/deletes unchanged.
- Real browser conflict checks passed: an offline local edit and a remote edit
  retained both versions across reload; copying local to a free slot preserved the
  remote original and synced the copy. Test villages were removed afterward.
- Cloud HTTP requests and the database check script now have 20-second timeouts so
  failures preserve local data and release the sync queue instead of hanging.
- Two dedicated test auth users were created with addresses matching
  `stillwater-beta-[ab]-*@example.com`. Their temporary village fixtures were
  removed. No real player's rows were changed. These test auth users can be
  removed later from Authentication → Users; no admin credential is available here.

## Implemented behavior

`accounts.js` uses the official, vendored Supabase JS client for email/password registration and sign-in,
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

## Configuration and repeatable verification

1. The public key is configured and accounts are enabled for beta. Use a separate
   project/configuration before live promotion.
2. Keep **Enable Email provider ON** and **Confirm email OFF** in Supabase
   Authentication → Sign In / Providers → Email. The user approved unconfirmed email/password accounts for beta.
   SMTP and email template customization are not needed for this flow. Password
   reset emails remain restricted without custom SMTP; no reset control is exposed.
   Never ask users to send passwords in chat. New passwords require at least 8
   characters in the beta UI and remain subject to the server's password policy.
3. Apply `backend/conflict-http-status.sql`, then use two dedicated **empty beta test accounts** and their short-lived access
   tokens to run `node scripts/check-supabase.mjs`. Supply `STILLWATER_PUBLIC_KEY`,
   `STILLWATER_TEST_TOKEN_A`, and `STILLWATER_TEST_TOKEN_B` through the environment,
   never chat or committed files. The script verifies anonymous denial, cross-user
   reads/writes/deletes, ownership injection, concurrent fourth-slot rejection,
   stale writes/deletes, and cleans only its own generated fixtures.
4. Verify actual password registration/sign-in and expired-session recovery in a browser.
   Exercise two devices, offline/reconnect, another-account login, slot switches
   during sync, conflicts, and sign-out with pending changes. Confirm beta storage
   keys and cloud `environment=beta`; no live storage or project access.
5. Follow `AGENTS.md` for beta publication. Do not promote to live without
   explicit approval.

## Local validation

- `npm run check` and `npm test` (66 tests at this increment).
- Run `PORT=5193 npm start`, then `scripts/check-villages.mjs` and
  `scripts/check-accounts.mjs` with `PLAYWRIGHT_MODULE` set to an available
  Playwright module path if needed. `STILLWATER_URL` and `CHROMIUM_PATH` are optional.
- The account browser check uses the shipped official SDK with mocked HTTP and
  test-only configuration. It does **not** verify Supabase authorization or real password registration.
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
