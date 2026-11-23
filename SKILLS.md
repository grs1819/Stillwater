# Stillwater 2.0D — founding skills (beta)

Skills are per village. The versioned `skills` field extends the existing schema-2 save:

```text
{ version: 1,
  xp: { cultivation, construction, hospitality, conservation },
  records: { trees, buildings, upgrades } }
```

Definitions, rewards, thresholds and unlocks live in `skills.js`; the small DOM view lives in `skills-view.js`. No dependencies, additional simulation or offline timers were added. Skill state is independent of Gold and remains suitable for future Renown consumers; no Renown mechanic is implemented.

## XP sources

| Skill | Activity | XP |
| --- | --- | ---: |
| Cultivation | Each tree above the village's previous largest tree count | 8 |
| Construction | Each blueprint building above its previous largest building count | 60 |
| Construction | Each purchased upgrade tier above the village’s previous total-tier record | 80 |
| Hospitality | Each staying guest per completed active five-second payout | 1 |
| Hospitality | Each served shop or café customer per completed active five-second payout | 1 |
| Conservation | Reserved for genuine future habitat activities | 0 currently |

Trees must be player-planted world objects; background scenery is excluded. No XP comes from Gold expenditure itself, appearance changes, architectural renovations, baseline income, paths, terrain, freeform roles or arbitrary water placement. Only the existing blueprint construction and functional upgrades contribute Construction XP. Conservation's `habitatRestored` event definition is reserved and disabled; no current action emits it.

## Progression and demonstration unlock

All four skills start at Level 1, with current display support through Level 20. The cumulative threshold for level `L` is:

`floor(60 × (1.22^(L−1) − 1) / 0.22)`

Level 2 requires 60 XP, Level 3 requires 133 XP. XP remains saved above the Level 20 display cap, allowing future expansion. All numerical values are configurable. Level-up feedback uses a short nonblocking status message and the existing rewarding chime, respecting the current audio controls and reduced-motion preference.

The data-driven `SKILL_UNLOCKS` registry demonstrates **Construction 3 → Warm Cedar blueprint exterior**. It reuses existing cedar color/material styling. Honey timber, pale birch, all existing designs and roof choices remain available as before. The freeform cedar milestone is untouched. The new choice is gated in the UI and checked again at placement/renovation; existing building identities and gameplay fields are preserved. Future unlock entries can describe designs, materials, buildings, equipment or environment features.

Hospitality level 2 unlocks the Woodland Café; level 3 unlocks business tier 2 (Capacity / Expanded Stock), and level 5 unlocks tier 3 (Premium Retreat / Woodland Outfitters). Both appear in the existing Skills panel and level-up feedback. Higher Gold rates do not multiply Hospitality XP; actual guests/customers still award one XP per active payout.

## Award and save safety

Development XP rewards expansion beyond persistent count records (upgrade progress is the sum of all business levels, not just the number of upgraded buildings), rather than repeatable purchase transactions or newly generated building IDs. Undo and removal retain XP **and** these records. Rebuilding to a former count, replacing tree species, re-upgrading replacement buildings, or repeated undo/rebuild cycles cannot award the same development progress again. A first completed expansion still counts even if later undone; this intentionally permits rearranging a village without losing skill levels. Further XP requires exceeding that record.

Gold, world changes, XP and activity records are saved in the same transaction before in-memory state changes. Failed/invalid/unaffordable actions award nothing. Hospitality uses the same completed active intervals as Gold, with no independent clock or queue, so reloading does not replay XP. Baseline-only payouts give no Hospitality XP. Existing stale-tab/save protections apply to the combined transaction.

Older 2.0 villages receive zero XP / Level 1 skills, with their current trees/buildings/upgrades recorded as the baseline. They are not deleted, retroactively credited or charged. Import/export and village slots retain skill state. As with Gold, local save files are user-editable; this is not server-authoritative anti-cheat.

## Validation and next steps

- All unit tests plus skill-specific threshold, cap, migration, unlock, repeated removal/undo/rebuild, cosmetic exclusion and fractional-Gold tests.
- Desktop and touch-emulated mobile: skill awards, level feedback, cedar gating/renovation, Gold deductions, save/reload, atomic quota failure and compact panel interactions.
- 320px and 390px portrait and 844px landscape layout checks; existing economy, business, village, renovation and soundtrack browser checks.
- Physical iOS/Android hardware testing remains recommended.

Next: playtest early XP pacing, then design meaningful garden development and habitat activities before enabling Conservation rewards or adding more unlocks. No new industries, workers or offline progression are included here. Publish beta only.
