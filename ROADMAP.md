# Stillwater direction

Stillwater is a peaceful 3D village builder combining Townscaper's creative freedom,
RollerCoaster Tycoon's gentle management, and Old School RuneScape's skill progression.
Management rewards thoughtful choices without punishing setbacks, constant upkeep,
or repetitive grinding.

## Modes
- **Village Mode (primary):** build a community, attract residents and visitors,
  operate businesses, earn currency and XP, and unlock content.
- **Creative Mode:** unrestricted building without economic or progression requirements.

## Phases
1. **Foundation:** reliable mobile controls and responsive UI; player accounts,
   cloud saves and multiple village slots; graphics, lighting, materials and
   performance; environmental ambience, effects and music with independent volumes.
2. **Gameplay:** a simple forgiving economy, resident happiness, business activity
   and visitor attraction; Construction, Hospitality, Fishing and Landscaping XP;
   achievable objectives and meaningful unlocks while retaining creative freedom.
3. **Expansion:** Woodlands, Coastal, Highlands and Countryside environments and
   their content; prepare for iOS/Android distribution. Optional cosmetic packs,
   building styles and environment expansions; no pay-to-win mechanics.

## Architecture and delivery
- Keep the vanilla JS/Three.js client and reuse current systems. `town.js` holds
  building rules; `terrain.js`, water modules, `navigation.js` and `villagers.js`
  own their existing domains. `app.js` connects state, rendering and interaction.
- Preserve current saved villages and legacy migration. Future mode, slot and
  progression data need explicit schema versions, migrations and recovery paths.
  Keep camera/gesture state and unconfirmed previews out of village saves.
- Retain a local-first save path. Design accounts/cloud sync separately, including
  offline behavior, conflict resolution, ownership and deletion. Local slots are
  implemented; authentication and remote synchronization are pending backend setup.
- Future management rules should be separate from rendering and switchable by mode.
  Reuse roles, connected buildings, navigation and existing unlock data where appropriate.
- Give audio its own lifecycle and volume buses, started by user interaction.
  Profile mobile rendering/input before introducing dependencies or major rewrites.
- Follow AGENTS.md: develop on beta, validate, stage the committed source into
  `/beta/`, preserve isolated beta saves, and promote only with explicit approval.

## Current increment: village saves
Three named local village slots, export/import, safe migration from the existing
single village, and recovery handling. Guest and future account collections use
separate storage namespaces; beta remains isolated from live. Original saves stay
untouched as recovery copies. Stale tabs and failed storage writes cannot silently
replace a newer saved collection.

Supabase project identified; database migration and setup notes are in `backend/`.
Authentication and cloud synchronization are not enabled or remotely tested yet.
Next: apply and verify ownership policies, then connect sign-in and revision-checked
sync with explicit conflict recovery. Never claim cloud protection for local saves.

## Validation
Run `npm run check` and `npm test`. The beta source also includes
`scripts/check-mobile.mjs`: with the local beta server running, provide
`STILLWATER_URL` and `PLAYWRIGHT_MODULE` for an existing Playwright installation.
The check exercises taps, gestures, cancellation, save/reload and mouse
behavior without adding a browser dependency to the shipped game.

`scripts/check-villages.mjs` covers migration, slot switching, names, deletion,
export/import, reload persistence and mobile dialog layout.
