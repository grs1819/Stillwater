import test from 'node:test';
import assert from 'node:assert/strict';
import {businessSummary,upgradeBusiness,upgradeQuote,BUSINESS} from '../businesses.js';
import {emptyWorld,cabinAt,buildingAt,SHOP,CABIN,validateWorld,renovateCabin,placementError,entrance} from '../blueprints.js';
import {advanceIncome,removalRefund,transactGold} from '../economy.js';
const cabin=(x=0,z=0)=>cabinAt(x,z);
const shop=(x=4,z=0)=>buildingAt(SHOP.id,x,z);
function comfortable(w,b){const [x,z]=entrance(b);w.blocks[`${x},0,${z}`]={type:'path'};w.blocks[`${x-1},0,${z}`]={type:'tree',species:'pine'};}
test('baseline survives without businesses; appeal attracts demand rather than direct Gold',()=>{
 const w=emptyWorld();assert.equal(businessSummary(w).income,1.5);
 for(let i=0;i<20;i++)w.blocks[`${i},0,0`]={type:'tree',species:'pine'};
 assert.equal(businessSummary(w).income,1.5);w.buildings=[shop()];assert.equal(businessSummary(w).rows[0].income,0);
});
test('cabins use beds and surroundings, never exceeding settlement demand',()=>{
 const w=emptyWorld(),b=cabin();w.buildings=[b];let r=businessSummary(w);assert.equal(r.guests,1);assert.equal(r.rows[0].capacity,2);
 comfortable(w,b);r=businessSummary(w);assert.equal(r.guests,2);assert.equal(r.income,3);
 w.buildings=[upgradeBusiness(b),cabin(-4,0),cabin(4,0)];
 for(const b of w.buildings)comfortable(w,b);
 r=businessSummary(w);assert.ok(r.guests<=r.demand);assert.ok(r.rows.every(row=>row.guests<=row.capacity));
 assert.deepEqual(businessSummary(w),r,'deterministic results');
 assert.deepEqual(businessSummary({...w,buildings:[...w.buildings].reverse()}).rows.sort((a,b)=>a.id.localeCompare(b.id)),[...r.rows].sort((a,b)=>a.id.localeCompare(b.id)),'save order cannot redirect guests');
});
test('shops share actual guests, obey range and capacity, and earn nothing in isolation',()=>{
 const w=emptyWorld(),b=cabin();w.buildings=[b,shop(),shop(-4,0),shop(0,-7)];comfortable(w,b);
 const r=businessSummary(w),shops=r.rows.filter(r=>r.shop);
 assert.equal(shops.reduce((n,s)=>n+s.customers,0),2);assert.equal(r.income,4.5);assert.equal(shops[2].customers,0);
 assert.ok(shops.every(s=>s.customers<=s.capacity));
 w.buildings=w.buildings.filter(b=>b.blueprint!==CABIN.id);assert.equal(businessSummary(w).income,1.5);
});
test('upgrades preserve IDs and purchase refund; renovations preserve functional capacity',()=>{
 const w=emptyWorld(),b=shop();b.paidGold=250;b.gameplay={inventory:{wood:2}};
 const upgraded=upgradeBusiness(b);assert.equal(upgradeQuote(b).cost,175);assert.equal(upgraded.id,b.id);assert.equal(removalRefund(upgraded),125);assert.deepEqual(upgraded.gameplay.inventory,b.gameplay.inventory);assert.equal(b.gameplay.businessLevel,undefined);
 assert.throws(()=>upgradeBusiness(upgraded));
 w.buildings=[renovateCabin(upgraded,{design:'woodland'})];assert.equal(businessSummary(w).rows[0].capacity,8);assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))),w);
 for(const level of [-1,4,'1',null])assert.throws(()=>validateWorld({...w,buildings:[{...upgraded,gameplay:{businessLevel:level}}]}));
});
test('shops support every orientation, collision rules and old saves',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const w=emptyWorld(),s=buildingAt(SHOP.id,0,0,rotation);assert.equal(placementError(s,w),null);w.buildings=[s];assert.ok(placementError(cabin(),w));assert.deepEqual(validateWorld(w),w);
 }
 const w=emptyWorld();w.buildings=[cabin()];assert.equal(validateWorld(w).buildings[0].gameplay.businessLevel,undefined);
 assert.throws(()=>buildingAt('unknown',0,0));
});
test('business payout persists remainder and refunds cannot undo away later income',()=>{
 const w=emptyWorld();w.buildings=[cabin(),shop()];const rate=businessSummary(w).income;
 let e=transactGold(w.economy,-450);e=advanceIncome(e,7500,rate).economy;
 assert.equal(e.gold,550+rate);assert.equal(e.activeMs,2500);w.economy=e;
 const loaded=validateWorld(JSON.parse(JSON.stringify(w)));assert.equal(advanceIncome(loaded.economy,2500,rate).earned,rate);
 assert.equal(transactGold(e,250).gold,800+rate);
});
test('longer session balances stay bounded by demand and customer sharing',()=>{
 const w=emptyWorld();w.buildings=[cabin(),shop()];comfortable(w,w.buildings[0]);
 const r=businessSummary(w);assert.equal(r.income,4.5);
 assert.equal(advanceIncome({...w.economy,gold:50},10*60*1000,r.income).economy.gold,590);
 for(let i=0;i<20;i++)w.buildings.push(shop(4,0));
 assert.equal(businessSummary(w).income,r.income,'duplicate shops cannot multiply one guest');
 assert.equal(BUSINESS.shopRadius,6);
});
