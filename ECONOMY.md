# Stillwater 2.0C beta economy

Balance constants live in `economy.js`: 500 starting Gold, cabins 200, design changes 75, finishes free, removal refunds 50% of original purchase price. Renovations never increase the refundable purchase amount. Landscaping and freeform construction remain free.

Income is paid every 10 focused, visible seconds: `2 + floor(appeal / 15)` Gold (12–42/min). Suspended intervals are discarded; there is no offline catch-up. The saved interval remainder prevents reloads from replaying payouts. Income stops on save errors.

Appeal is calculated from the village, not saved separately:

| Source | Contribution / cap |
| --- | --- |
| Blueprint cabins | First 4: 5 each; next 4: 2 each (28) |
| Architectural variety | 2 per additional design (4) |
| Trees | First 6: 1 each; next 6: 0.5 each; 1 per extra species (12) |
| Paths | First 8: 0.5 each; next 8: 0.25 each (6) |
| Outdoors | 2 per accessory kind (8); first 3 camps: 2 each, next 3: 1 each (9) |
| Waterfront cabins | 2 each for first 4 cabins with water within 2.5 tiles of center (8) |

The total is rounded down, maximum 75. Background scenery is excluded. Repeated scenery additions stop contributing at their cap. Early income is deliberately modest: a renovation takes about 6.25 minutes at baseline, and additional cabins become quicker with landscaping. Playtest a 10–15 minute session before changing rates.

Economy version 1 lives within the existing schema-2 village save. Earlier 2.0 beta villages receive 500 Gold; their existing free cabins have a zero purchase record and no removal refund. Saves are written before committing transactions. Undo reverses the actual transaction delta while keeping later income; a refund undo requires enough Gold to repay it. Permanent cabin identity and gameplay state survive renovation.

This is local gameplay state, not server-authoritative currency: exported save files can be edited. Accounts, offline earnings, skills, workers and production remain outside this milestone. Production saves and the root live game are unchanged.

Validation: `npm run check`, `node --test --test-isolation=none tests/*.test.js`, and browser scripts `check-economy`, `check-blueprints`, `check-renovations`, `check-mobile`, `check-villages`, `check-crossfade`. Browser tests use Chromium desktop and mobile touch emulation, not physical iOS hardware.
