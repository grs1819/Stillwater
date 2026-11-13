# Accounts and cloud saves — pending service setup

Current implemented increment: local village slots and safe migration, in
`village-store.js`. No authentication, remote storage or cloud-sync claims are
exposed to players. GitHub Pages remains the static game host.

Recommended next service: a dedicated **beta Supabase project**, using managed
email-code authentication and PostgreSQL row-level security. A live project should
be configured separately before production promotion. The environment column is
an additional guard against mixing beta/live villages, not a substitute for separate
production configuration.

## Required setup
1. Create a Supabase project (or identify the existing project).
2. Provide the project URL and **publishable/anon client key** for the game. These
   are public frontend configuration. Never put a service-role key or database
   password in the game, repository, or chat.
3. Review/run `backend/supabase.sql` in the beta project's SQL editor. It allows
   authenticated players to read only their own rows. Mutations go through RPCs
   which check the authenticated identity, expected revision, and three-slot limit.
4. Configure email authentication and delivery for public beta users. Supabase's
   default mail service has restrictions; configure production-capable SMTP before
   opening account creation to arbitrary players. Use an OTP email template if
   the chosen client flow accepts codes, rather than sending a different flow's link.
5. Permit the project's HTTPS hostname in the development environment if remote
   testing is blocked. This is not needed for the independent local-slot tests.

Beta project identified: `dpxkbhuvhansozshyuvo`
(`https://dpxkbhuvhansozshyuvo.supabase.co`). The public client key has been provided.
No backend-management integration is available to this chat; linking Supabase to
GitHub does not grant database-management access here. The workspace proxy
currently denies the project hostname (HTTP 403). A network draft has been saved. The SQL is a proposed migration, **not executed or remotely
validated**. Do not enable account UI or describe it as deployed until the project
is available and the tests below pass.

## Next implementation
- Use the official Supabase client for email-code sign-in, session refresh and
  sign-out. Never implement a custom password database.
- Keep guest saves and each authenticated identity in separate local collections.
  Sign-in must not automatically upload a shared-device guest village. Offer an
  explicit copy into an account slot; sign-out must restore the guest collection.
- Save locally first; debounce remote writes and expose local/syncing/synced/offline
  status. Include the local revision in a request so acknowledgements cannot mark
  newer edits as already synced.
- On revision conflict, retain both versions until the player explicitly chooses
  local/cloud or copies the local village to another available slot. Do not use
  client clocks or last-write-wins to overwrite another device.
- Refresh a clean cache from remote on sign-in/open/focus. Preserve dirty cached
  villages during network failure or sign-out. Stop in-flight jobs from one user
  from affecting another user's UI or collection.
- Account deletion needs a verified managed-backend flow and should remove that
  user's cloud rows; local exports remain under the player's control.

## Required integration checks
Two real test users: anonymous access denied; user A cannot read, change or delete
B's rows; caller-supplied ownership cannot bypass authorization; a fourth slot is
rejected under concurrent creates; stale saves/deletes fail without modifying data.
Exercise sign-in, expired session recovery, logout/login as another account, offline
edits/reconnect, simultaneous-device conflicts, switching slots during sync, and
beta/live separation. Preserve local saves on all errors. Mock tests alone do not
establish database authorization or email delivery.
