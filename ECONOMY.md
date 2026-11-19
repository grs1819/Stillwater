# Stillwater business economy — beta

The active-play loop is now: improve appeal → host guests → serve them in shops → earn Gold → expand. No accounts, workers, inventory simulation, skills or offline earnings are added.

## Prices and capacities

| Building / action | Gold | Effect |
| --- | ---: | --- |
| Starting balance | 1000 | Existing balances retained |
| Timber Guest Cabin | 200 | 2 beds |
| Cozy extra beds | 150 | 4 beds, +1 comfort contribution |
| Supply Shop | 250 | Serves up to 4 nearby guests |
| Expanded shelves | 175 | Serves up to 8 nearby guests |
| Architectural renovation | 75 | Appearance only |
| Finish changes | 0 | Appearance only |

Removal refunds 50% of the original purchase price, excluding upgrades and renovations. Older free beta buildings still refund zero. Each business has one functional upgrade. All three architectural styles and existing finishes work for both blueprints, with a distinctive shopfront canopy, sign and crates.

## Occupancy and earnings

- Keep the 1.5 Gold per 5 active seconds baseline (18/min).
- Appeal no longer pays Gold directly. Guest demand is `2 + floor(appeal / 10)`, currently at most 9 guests.
- Each cabin can welcome `min(beds, 1 + entrance path + nearby nature + upgrade)` guests. Nature means a tree, outdoor accessory or water within 3 tiles of its center. Each contribution is 0 or 1; decorative duplicates do not stack.
- Distribute demand across cabins one guest per round, preferring stronger comfort contributions and breaking ties by stable building ID. Guests are an abstract current occupancy count, not additional animated NPCs.
- Every staying guest earns their cabin 0.75 Gold per interval (9/min).
- Shops serve occupied cabins within 6 tiles, measured center-to-center. Each guest is allocated to the nearest shop with remaining capacity, once only. Additional shops share demand instead of duplicating it. No pathfinding simulation is needed.
- Every customer earns their shop 0.75 Gold per interval (9/min).
- The resulting ceiling is 180 Gold/min with 9 guests all served by shops. Baseline is available even with no buildings.

A cabin and nearby shop cost 450. Without improvements they generate 36 Gold/min total; an entrance path or nearby nature allows two guests and 54/min. A ten-minute session then earns 540 Gold, enough for an upgrade or another business. Upgrades increase capacity, not guaranteed customers; the UI shows demand, current utilization, earnings and suggestions. Playtest these rates before adding industries.

## Appeal

Derived from player scenery and guest cabins, with the previous diminishing returns retained:

| Source | Contribution / cap |
| --- | --- |
| Guest cabins | First 4: 5 each; next 4: 2 each (28) |
| Cabin architectural variety | 2 per additional design (4) |
| Trees | First 6: 1 each; next 6: 0.5 each; 1 per extra species (12) |
| Paths | First 8: 0.5 each; next 8: 0.25 each (6) |
| Outdoors | 2 per accessory kind (8); first 3 camps: 2 each, next 3: 1 each (9) |
| Waterfront cabins | 2 each for first 4 cabins with water within 2.5 tiles (8) |

Total is rounded down, maximum 75. Shops and background scenery do not inflate appeal. Rates and capacities are configurable in `economy.js`, `businesses.js` and the blueprint registry.

## State and safeguards

Continue schema-2 village saves and economy version 2. Supply Shops have their own blueprint ID with the same 2×2 footprint/entrance rules. Optional `gameplay.businessLevel` is absent/0 for existing buildings and 1 after upgrading. Appearance changes preserve this and all other gameplay data. Guest/customer counts are derived; calculations are cached until relevant world references change.

Writes occur before committing a transaction. Undo reverses its actual Gold delta while retaining subsequent earnings. A failed or unaffordable action changes neither building state nor Gold. Functional upgrades do not raise removal refunds. Reload preserves the partial income interval without duplicating payouts. Background and suspended time do not accrue offline rewards.

This remains local gameplay currency, not server-authoritative anti-cheat: exported saves can be edited. Freeform building and landscaping remain free and do not operate businesses. Production files, saves, audio and account settings are unchanged.

## Validation

Run `npm run check`, `node --test --test-isolation=none tests/*.test.js`, and browser scripts `check-businesses`, `check-economy`, `check-blueprints`, `check-renovations`, `check-mobile`, `check-villages`, `check-crossfade`. Browser validation uses Chromium desktop and mobile touch emulation; physical iOS testing is still recommended.

Five-second payouts retain quarter-Gold internally (`goldFraction`, 0–3) and credit only whole Gold. Fractions survive transactions, undo and reloads. Version-1 saves preserve their Gold and scale their old interval progress by one half, without awarding catch-up income. New villages receive 1,000 Gold; existing balances are not topped up.
