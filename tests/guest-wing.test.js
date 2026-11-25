import test from 'node:test';import assert from 'node:assert/strict';
import {emptyWorld,cabinAt,buildingAt,SHOP,withGuestWing,footprint,entrance,placementError,validateWorld,navigationBlocks,renovateCabin} from '../blueprints.js';
import {businessSummary,businessTier,upgradeQuote} from '../businesses.js';
import {initialSkills,developmentXP} from '../skills.js';
test('rear wing expands rotated footprint, preserves entrance, ID, upgrades and finishes',()=>{
 for(let rotation=0;rotation<4;rotation++){
 const b=cabinAt(0,0,rotation);b.gameplay={businessLevel:2,custom:'kept'};const wing=withGuestWing(b);
 assert.equal(footprint(wing).length,6);assert.deepEqual(entrance(wing),entrance(b));assert.equal(wing.id,b.id);assert.equal(wing.gameplay.custom,'kept');assert.equal(wing.gameplay.businessLevel,2);
 const w={...emptyWorld(),buildings:[wing]};assert.deepEqual(validateWorld(w).buildings,[wing]);assert.equal(Object.keys(navigationBlocks({},[wing])).length,6);
 const [x,z]=footprint(wing)[4];w.blocks[`${x},0,${z}`]={type:'tree'};assert.match(placementError(wing,w),/Clear/);w.blocks={};w.water[`${x},${z}`]='lake';assert.match(placementError(wing,w),/dry/);
 }
 assert.throws(()=>withGuestWing(buildingAt(SHOP.id,0,0)));assert.throws(()=>withGuestWing(withGuestWing(cabinAt(0,0))));
});
test('wing capacity remains additive across all tiers and does not guarantee guests',()=>{
 for(let level=0;level<4;level++){const b=cabinAt(0,0);b.gameplay.businessLevel=level;const wing=withGuestWing(b);assert.equal(businessTier(wing).capacity,businessTier(b).capacity+2);if(level<3)assert.equal(upgradeQuote(wing).capacity,upgradeQuote(b).capacity+2);
 const r=businessSummary({...emptyWorld(),buildings:[wing]});assert.ok(r.guests<=r.demand);assert.equal(r.rows.length,1);assert.equal(r.rows[0].pos[0],.5);assert.equal(r.rows[0].pos[1],0);}
});
test('wing purchase earns one upgrade reward; undo and rebuild cannot farm XP',()=>{
 const b=cabinAt(0,0),before={...emptyWorld(),buildings:[b]},after={...before,buildings:[withGuestWing(b)]};let state=initialSkills(before);state=developmentXP(state,before,after);assert.equal(state.xp.construction,80);assert.equal(developmentXP(state,before,after).xp.construction,80);
 assert.equal(renovateCabin(after.buildings[0],{design:'woodland'}).gameplay.guestWing,true);
});
test('wing overlaps, edges and unsupported persisted flags are rejected',()=>{
 assert.match(placementError(withGuestWing(cabinAt(0,-9)),emptyWorld()),/clearing/);
 assert.match(placementError(withGuestWing(cabinAt(0,0)),{...emptyWorld(),terrain:{'0,-1':1}}),/Level/);
 const b=withGuestWing(cabinAt(0,0)),other=cabinAt(0,-2);assert.ok(placementError(b,{...emptyWorld(),buildings:[other]}));
 for(const guestWing of [null,1,'rear'])assert.throws(()=>validateWorld({...emptyWorld(),buildings:[{...b,gameplay:{guestWing}}]}));
 assert.throws(()=>validateWorld({...emptyWorld(),buildings:[{...buildingAt(SHOP.id,0,0),gameplay:{guestWing:true}}]}));
});
