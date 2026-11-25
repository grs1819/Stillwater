import test from 'node:test';import assert from 'node:assert/strict';
import {emptyWorld,cabinAt,withCabinAddition,additionQuote,footprint,validateWorld,placementError} from '../blueprints.js';
import {businessTier,upgradeQuote,upgradeBusiness,businessSummary} from '../businesses.js';
import {initialSkills,developmentXP} from '../skills.js';
const skills={...initialSkills(),xp:{...initialSkills().xp,hospitality:400}};
test('legacy purchases credit porch and recognize loft without changing old footprints',()=>{
 for(const level of [1,2,3]){const b=cabinAt(0,0);b.gameplay.businessLevel=level;assert.equal(additionQuote(b,'frontPorch').cost,0);assert.equal(additionQuote(b,'loft').installed,level>=2);assert.equal(footprint(b).length,4);}
});
test('independent additions credit later tiers without double beds or XP',()=>{
 const base=cabinAt(0,0),porch=withCabinAddition(base,'frontPorch'),both=withCabinAddition(porch,'loft');assert.equal(businessTier(both).capacity,4);assert.equal(upgradeQuote(both).cost,0);
 const t1=upgradeBusiness(both,skills);assert.equal(businessTier(t1).capacity,6);assert.equal(upgradeQuote(t1).cost,0);
 const t2=upgradeBusiness(t1,skills);assert.equal(businessTier(t2).capacity,6);
 const world=b=>({...emptyWorld(),buildings:[b]});let xp=developmentXP(initialSkills(world(base)),world(base),world(both));assert.equal(xp.xp.construction,160);xp=developmentXP(xp,world(both),world(t1));xp=developmentXP(xp,world(t1),world(t2));assert.equal(xp.xp.construction,160);
 assert.equal(businessSummary(world(porch)).rows[0].quality,1);
});
test('porch and wing occupy real tiles in every rotation and persist together',()=>{
 for(let rotation=0;rotation<4;rotation++){const b=['guestWing','frontPorch','loft'].reduce((b,k)=>withCabinAddition(b,k),cabinAt(0,0,rotation));assert.equal(footprint(b).length,8);assert.deepEqual(validateWorld({...emptyWorld(),buildings:[b]}).buildings,[b]);const [x,z]=footprint(b).at(-1);assert.match(placementError(b,{...emptyWorld(),water:{[`${x},${z}`]:'lake'}}),/dry/);}
});
test('bad additions are rejected and installation cannot repeat',()=>{const b=withCabinAddition(cabinAt(0,0),'frontPorch');assert.throws(()=>withCabinAddition(b,'frontPorch'));assert.throws(()=>validateWorld({...emptyWorld(),buildings:[{...b,gameplay:{loft:'yes'}}]}));});
