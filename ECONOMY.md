# Stillwater business economy — beta

The active-play loop is now: improve appeal → host guests → serve them in shops → earn Gold → expand. This builds on founding skills; no workers, inventory simulation or offline earnings are added.

## Prices and capacities

| Building / action | Gold | Effect |
| --- | ---: | --- |
| Starting balance | 1000 | Existing balances retained |
| Timber Guest Cabin | 200 | 2 beds |
| Cabin Comfort | 150 | 4 beds, +1 comfort contribution, porch/flowers/bench |
| Cabin Capacity | 250 | Hospitality 3; 6 beds, 12 Gold/min per guest, dormer loft |
| Premium Retreat | 450 | Hospitality 5; 6 beds, 18 Gold/min per guest, balcony/chimney |
| Supply Shop | 250 | Serves up to 4 nearby guests |
| Better Displays | 175 | Serves up to 8 nearby guests, outdoor displays/canopy |
| Expanded Stock | 275 | Hospitality 3; capacity 10, 12 Gold/min per customer, raised roof windows |
| Woodland Outfitters | 500 | Hospitality 5; capacity 12, 18 Gold/min per customer, timber portico/stone piers |
| Woodland Café | 200 | Hospitality 2; serves 2 guests, 6 Gold/min per customer |
| Cozy Tables | 125 | Hospitality 2; capacity 4, 9 Gold/min per customer |
| Forest Tearoom | 225 | Hospitality 3; capacity 6, 12 Gold/min per customer |
| Retreat Café | 400 | Hospitality 5; capacity 8, 15 Gold/min per customer |
| Architectural renovation | 75 | Appearance only |
| Finish changes | 0 | Appearance only |

Removal refunds 50% of the original purchase price, excluding upgrades and renovations. Older free beta buildings still refund zero. Each business now has three functional tiers. Existing tier-one purchases retain their capacity and earnings without a new charge. Prices are per tier, not cumulative. All three architectural styles and existing finishes work for both blueprints, with a distinctive shopfront canopy, sign and crates.

## Occupancy and earnings

- Keep the 1.5 Gold per 5 active seconds baseline (18/min).
- Appeal no longer pays Gold directly. Guest demand is `2 + floor(appeal / 10)`, currently at most 9 guests.
- Each cabin can welcome `min(beds, 1 + entrance path + nearby nature + upgrade)` guests. Nature means a tree, outdoor accessory or water within 3 tiles of its center. Path and nature contributions are 0 or 1; the upgrade contribution is the level (0–3); decorative duplicates do not stack.
- Distribute demand across cabins one guest per round, preferring stronger comfort contributions and breaking ties by stable building ID. Guests are an abstract current occupancy count, not additional animated NPCs.
- Each staying guest earns their cabin 0.75 / 0.75 / 1 / 1.5 Gold per interval at tiers 0 / 1 / 2 / 3 (9 / 9 / 12 / 18 per minute).
- Shops serve occupied cabins within 6 tiles, measured center-to-center. Each guest is allocated to the nearest shop with remaining capacity, once per service type (shop and café). Additional businesses of the same type share demand instead of duplicating it. No pathfinding simulation is needed.
- Each served customer earns the same tier-based rates for their shop.
- The resulting ceiling is 477 Gold/min with 9 guests all staying in tier-three cabins and served by tier-three shops and cafés (enough café capacity is required). Capacity beyond current demand is headroom, not guaranteed income. Baseline is available even with no buildings.

A cabin and nearby shop cost 450. Without improvements they generate 36 Gold/min total; an entrance path or nearby nature allows two guests and 54/min. A ten-minute session then earns 540 Gold, enough for an upgrade or another business. Upgrades improve comfort, capacity and later per-visitor earnings, not guaranteed customers; the UI shows demand, current utilization, earnings and suggestions. Playtest these rates before adding industries.

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

Continue schema-2 village saves and economy version 2. Supply Shops have their own blueprint ID with the same 2×2 footprint/entrance rules. Optional `gameplay.businessLevel` is absent/0 for existing buildings and 1–3 after upgrading. Appearance changes preserve this and all other gameplay data. Guest/customer counts are derived; calculations are cached until relevant world references change.

Writes occur before committing a transaction. Undo reverses its actual Gold delta while retaining subsequent earnings. A failed or unaffordable action changes neither building state nor Gold. Functional upgrades do not raise removal refunds. Reload preserves the partial income interval without duplicating payouts. Background and suspended time do not accrue offline rewards.

This remains local gameplay currency, not server-authoritative anti-cheat: exported saves can be edited. Freeform building and landscaping remain free and do not operate businesses. Production files, saves, audio and account settings are unchanged.

## Validation

Run `npm run check`, `node --test --test-isolation=none tests/*.test.js`, and browser scripts `check-businesses`, `check-economy`, `check-blueprints`, `check-renovations`, `check-mobile`, `check-villages`, `check-crossfade`. Browser validation uses Chromium desktop and mobile touch emulation; physical iOS testing is still recommended.

Five-second payouts retain quarter-Gold internally (`goldFraction`, 0–3) and credit only whole Gold. Fractions survive transactions, undo and reloads. Version-1 saves preserve their Gold and scale their old interval progress by one half, without awarding catch-up income. New villages receive 1,000 Gold; existing balances are not topped up.


## Visible progression and verification

`BUSINESS_TIERS` in businesses.js defines upgrade costs, Hospitality gates, capacities, rates and descriptions. `upgradeError` rechecks the skill gate before mutation; the existing transaction checks funds and saves Gold, building state and XP atomically. Construction awards 80 XP per new total-tier record, preserving anti-farm records through undo/removal. No save-version migration or production reset is needed: old levels 0/1 retain their meaning.

The shared cabin renderer adds tier features for every architectural style and finish, and for renovation ghosts. Tier 1 cabins recess the front wall to make room for the porch and bench; tier 3 recesses the upper gable for a real balcony. Shops retain their existing glazing and gain displays, clerestory roof windows and a portico. All details remain within the original 2×2 envelope plus the original reserved entrance. New static details are batched by material inside named feature groups; there are no new lights, textures loaded from the network, dependencies or per-frame animations.

`check-business-tiers.mjs` covers 216 type/design/exterior/roof/tier combinations, rotated bounds, final/ghost geometry parity, feature presence, geometry disposal, skill/funds gates, atomic failed writes, undo/XP records, renovations and reload. Existing skills, businesses, renovations and Gold-pace browser checks remain applicable. Physical iPhone/Android performance should still be playtested.

Pacing: a cabin and shop serving two guests earn 48 Hospitality XP/minute. Hospitality 3 takes about 2.8 active minutes (133 XP), and level 5 about 6.9 minutes (331 XP). Costs and visitor demand determine when the purchases are affordable; existing progress and balances are retained. The XP curve and initial 1,000 Gold remain unchanged.


## Café and progression balance

The café is a schema-2 `woodland-cafe` blueprint with the same entrance, 2×2 footprint, architecture, finishes, renovation and save rules. Hospitality 2 (60 XP) unlocks it; both UI selection and placement/ghost validation enforce the gate. Existing imported cafés can still be renovated. The café has visible tables/chairs, cups, pastries, a cup emblem and menu board; tiers add a planter counter, roof windows and timber portico. No workers, recipes, inventories or offline accrual are introduced.

Each staying guest can visit one shop AND one café per payout. Nearest available businesses are allocated deterministically within six tiles, separately by service type. Duplicating cafés cannot duplicate a guest's café payment or Hospitality XP. A café cannot create lodging demand or earn in isolation. Cafés award the same one Hospitality XP per served customer and Construction XP on genuine expansion/upgrades as existing businesses.

Cabin tiers 2/3 now cost 250/450 (previously 300/600); shop tiers 2/3 cost 275/500 (previously 350/650). Existing balances, earned XP, purchased tiers and first upgrade prices remain unchanged; no retroactive refunds or resets. The XP curve is unchanged. Starting with two guests and a shop, Hospitality 2 takes about 75 active seconds. Adding a café brings earnings from 54 to 66 Gold/min and Hospitality from 48 to 72 XP/min. Continuing to serve those guests reaches Hospitality 3 around 2–3 active minutes total, and Hospitality 5 around 5 minutes. Real results depend on occupancy and player spending. This balances the early loop through an achievable new service and lower upgrade costs rather than granting XP for purchases.

Café tests cover customer sharing/range/capacity, no lodging demand, exact Gold/XP rates, unlocks, pricing, save/renovation identity, bounds, real desktop/mobile placement and undo. Physical device performance remains a playtest check.
