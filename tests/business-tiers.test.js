import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorld,buildingAt,CABIN,SHOP,validateWorld,renovateCabin,entrance} from '../blueprints.js';
import {BUSINESS_TIERS,businessSummary,upgradeBusiness,upgradeQuote,upgradeError} from '../businesses.js';
import {xpForLevel,developmentXP,hospitalityXP,initialSkills,levelGains} from '../skills.js';
import {advanceIncome,transactGold,removalRefund} from '../economy.js';
const skills=level=>({...initialSkills(),xp:{...initialSkills().xp,hospitality:xpForLevel(level)}});
test('three upgrades gate at Hospitality 1/3/5 and retain identity, finishes and arbitrary functional state',()=>{
 for(const id of [CABIN.id,SHOP.id]){
  let b=buildingAt(id,0,0,2,{exterior:'birch',roof:'slate'});b.gameplay={inventory:{timber:7},workers:['future']};b.paidGold=id===SHOP.id?250:200;const original=structuredClone(b);
  for(let tier=1;tier<=3;tier++){
   const quote=upgradeQuote(b),required=[0,1,3,5][tier];assert.equal(quote.hospitality,required);
   if(tier>1)assert.throws(()=>upgradeBusiness(b,skills(required-1)),/Hospitality/);
   b=upgradeBusiness(b,skills(required));assert.equal(b.gameplay.businessLevel,tier);
   assert.equal(b.id,original.id);assert.deepEqual(b.position,original.position);assert.equal(b.rotation,2);assert.deepEqual(b.appearance,original.appearance);assert.deepEqual(b.gameplay.inventory,{timber:7});assert.equal(removalRefund(b),original.paidGold/2);
   assert.equal(renovateCabin(b,{design:'woodland'}).gameplay.businessLevel,tier);
   const w={...emptyWorld(),buildings:[b],skills:skills(required)};assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))),w);
  }
  assert.equal(upgradeQuote(b),null);assert.throws(()=>upgradeBusiness(b,skills(20)),/fully upgraded/);
 }
});
test('each functional tier increases village upgrade records once, including undo/rebuild and reload',()=>{
 let w=emptyWorld();w.skills=skills(5);const b=buildingAt(CABIN.id,0,0);w.buildings=[b];w.skills.records.buildings=1;
 for(let i=1;i<=3;i++){
  const before=structuredClone(w),next={...w,buildings:[upgradeBusiness(w.buildings[0],w.skills)]};next.skills=developmentXP(w.skills,w,next);
  assert.equal(next.skills.xp.construction,i*80);assert.equal(next.skills.records.upgrades,i);
  const undone={...before,skills:next.skills};assert.equal(developmentXP(undone.skills,undone,next).xp.construction,i*80);
  w=validateWorld(JSON.parse(JSON.stringify(next)));
 }
 const cleared={...w,buildings:[]};const rebuilt={...w,buildings:[{...w.buildings[0],id:crypto.randomUUID()}]};assert.equal(developmentXP(w.skills,cleared,rebuilt).xp.construction,240);
});
test('tier earnings remain quarter-Gold exact, demand limited, and shared between shops',()=>{
 for(let level=0;level<=3;level++){
  const w=emptyWorld(),c=buildingAt(CABIN.id,0,0),s=buildingAt(SHOP.id,4,0);c.gameplay.businessLevel=s.gameplay.businessLevel=level;w.buildings=[c,s];
  const [x,z]=entrance(c);w.blocks[`${x},0,${z}`]={type:'path'};w.blocks[`${x-1},0,${z}`]={type:'tree',species:'pine'};
  const r=businessSummary(w);assert.ok(r.guests<=r.demand);assert.equal(r.rows[1].customers,r.guests);assert.equal(r.income,1.5+r.guests*(BUSINESS_TIERS.cabin[level].rate+BUSINESS_TIERS.shop[level].rate));
  const spent=transactGold(w.economy,-(level?BUSINESS_TIERS.cabin[level].cost:200));assert.ok(spent.gold<w.economy.gold);
  assert.equal(advanceIncome(spent,5000,r.income).earned,Math.floor(r.income));
  w.buildings.push({...s,id:crypto.randomUUID()});assert.equal(businessSummary(w).income,r.income);
 }
});
test('Hospitality unlocks are attainable through guests, but spending and rate upgrades do not multiply XP',()=>{
 const s=skills(1),report={guests:2,rows:[{shop:true,customers:2}]};const next=hospitalityXP(s,report,34);assert.ok(next.xp.hospitality>=xpForLevel(3));assert.ok(levelGains(s,next)[0].unlocks.some(u=>u.id==='business-tier-2'));
 assert.equal(upgradeError(upgradeBusiness(buildingAt(SHOP.id,0,0)),next),null);
});
