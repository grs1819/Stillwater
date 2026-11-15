# Stillwater 2.0: first blueprint

Beta-only prototype: Building → Timber Guest Cabin. Desktop: hover to preview and click to place one 2 × 2 cabin. Mobile: tap dry,
level ground for a ghost, then Rotate, Place cabin or Cancel. A doorway arrow
indicates facing; green/red preview colors indicate placement validity. Preview
state is temporary and never saved. Camera gestures/tool changes cancel it. Rotate before placement in quarter turns. Tap any cabin surface
to select the whole building and change its exterior or roof in the existing dock.
The highlighted footprint identifies the selected cabin. Place another cabin clears
selection. Remove/right-click/hold Remove deletes the entire instance; Undo restores
its ID and finishes. Freeform building remains available in the Building selector.

## Architecture
- `blueprints.js`: version-1 guest-cabin definition, appearance presets, rotated
  footprint/entrance, collision rules, pure customization and version-2 world validation.
- Instances store UUID, blueprint ID/version, design, grid position, quarter-turn
  rotation, appearance and separate gameplay data. No economic or production logic
  is implemented. Changing finishes preserves identity and gameplay data.
- `cabin-view.js`: separate Three.js group, reusing existing box/timber beam/material/
  roofing helpers. Meshes are cached by instance and appearance; changed or deleted
  cabin geometry is disposed without disposing shared materials. No new dependency.
- Footprints are derived, not duplicated in saves. Navigation gets derived obstruction
  cells; cabins do not become connected freeform buildings. A fixed entrance approach
  accepts paths but reserves space against obstacles/water; surrounding terrain must
  stay level. The existing bounded clearing remains the placement policy for now.

## Saves and isolation
World schema 2 stores `blocks`, `water`, `terrain`, `peak`, and `buildings`.
Blocks continue to represent existing scenery/freeform tools. Blueprint instances
remain separate; appearance never determines worker/inventory state.
The existing three-slot store accepts injected validation/default-world functions.
2.0 disables legacy migration and uses `stillwater-2-v1` in source, rewritten to
`stillwater-2-beta-v1` when staging. Previous live/beta saves are not deleted or read.
Export envelopes use version 2. Unsupported world/building versions and overlapping
blueprints are rejected rather than silently converted. Local revision/owner fields
remain available for future cloud integration; Supabase sync is not enabled for 2.0. Newer account/sync modules are retained,
but accountConfig.enabled is false for this milestone: the existing backend uses
the old beta collection. No remote rows are read, reset, or overwritten. A separate
cloud namespace/schema must be provisioned and tested before enabling 2.0 accounts.

## Validation
`npm run check` and `npm test`. Browser scripts use external Playwright via
`PLAYWRIGHT_MODULE` and the local URL via `STILLWATER_URL`:
- `scripts/check-blueprints.mjs`: desktop/mobile placement, selection, customization,
  identity, rotation, undo/remove, reload, export/import and production-key isolation.
- `scripts/check-mobile.mjs`: existing gestures, cancellation, long-press actions,
  terrain/water/freeform tools and desktop edits.
- `scripts/check-villages.mjs`: slot management and version-2 import/export.
- `scripts/check-crossfade.mjs`: soundtrack transitions and independent ambience.

## Deliberate limits / next milestone
One 2 × 2 design; grid placement and quarter-turn rotation before placement only.
No attachment/automatic joining to blueprint cabins, staffing, Gold, progression,
renovations, map expansion or cloud saving. Existing tasks still describe freeform
cottage progression; prototype guest cabins do not award that old progression.
Next: a second design with the same footprint/entrance and an atomic renovation
operation that preserves the building ID and gameplay state. Add pricing only when
an economy milestone is approved. Physical iOS/Android validation remains necessary.
