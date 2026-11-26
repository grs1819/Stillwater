import test from 'node:test';
import assert from 'node:assert/strict';
import {SAUNA,CABIN,buildingAt,emptyWorld,validateWorld,footprint,renovateCabin,placementError} from '../blueprints.js';
import {BUSINESS_TIERS,businessSummary,upgradeBusiness,upgradeQuote,upgradeError,settleIncome} from '../businesses.js';
const skills={...emptyWorld().skills,xp:{...emptyWorld().skills.xp,hospitality:100000}};
test('sauna has five gated upgrades, stable identity, footprint and valid saved tiers',()=>{
 let b=buildingAt(SAUNA.id,0,0);const original=b;assert.equal(BUSINESS_TIERS.sauna.length,6);
 for(let level=0;level<=5;level++){
  const w=emptyWorld();w.buildings=[b];assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))),w);assert.deepEqual(footprint(b),footprint(original));assert.equal(b.id,original.id);
  if(level<5){assert.ok(upgradeQuote(b).cost>0);if(level>0)assert.match(upgradeError(b,emptyWorld().skills),/Hospitality/);b=upgradeBusiness(b,skills);}
 }
 assert.equal(upgradeQuote(b),null);assert.throws(()=>upgradeBusiness(b,skills));
 const renovated=renovateCabin(b,{design:b.design,appearance:{exterior:'birch',roof:'slate'}});assert.deepEqual(renovated.gameplay,b.gameplay);assert.equal(renovated.id,b.id);
 const w=emptyWorld();w.buildings=[b];assert.ok(placementError(buildingAt(SAUNA.id,0,0),w));
 b.gameplay.businessLevel=6;assert.throws(()=>validateWorld(w));b.blueprint=CABIN.id;b.gameplay.businessLevel=4;assert.throws(()=>validateWorld(w));
});
test('saunas need lodging guests, share customers, and settle valid fractional earnings offline',()=>{
 const w=emptyWorld(),a=buildingAt(SAUNA.id,3,0),b=buildingAt(SAUNA.id,-3,0);w.buildings=[a,b];assert.equal(businessSummary(w).income,1.5);
 w.buildings.push(buildingAt(CABIN.id,0,0));
 for(let level=0;level<=5;level++){
  a.gameplay.businessLevel=level;b.gameplay.businessLevel=level;const r=businessSummary(w),saunas=r.rows.filter(r=>r.kind==='sauna');assert.equal(saunas.reduce((n,r)=>n+r.customers,0),r.guests);assert.equal(r.rows.filter(r=>!r.shop).length,1);
  const settled=settleIncome({...w.economy,lastIncomeAt:1000},w.skills,r,61000);assert.ok(settled.earned>0);assert.deepEqual(settleIncome(settled.economy,settled.skills,r,61000).earned,0);
 }
});
