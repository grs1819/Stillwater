import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorld,buildingAt,CABIN,SHOP,CAFE,BLUEPRINTS,validateWorld,renovateCabin,entrance,placementError} from '../blueprints.js';
import {businessSummary,upgradeBusiness,upgradeQuote} from '../businesses.js';
import {initialSkills,xpForLevel,unlocked,hospitalityXP,developmentXP} from '../skills.js';
import {advanceIncome,transactGold,removalRefund} from '../economy.js';
const at=(type,x=0,z=0)=>buildingAt(type,x,z);
function village(){const w=emptyWorld();w.buildings=[at(CABIN.id),at(SHOP.id,4),at(CAFE.id,-4)];w.blocks['0,0,2']={type:'path'};return w;}
test('café serves existing guests independently of shops but duplicates share customers',()=>{
 const w=village(),r=businessSummary(w);assert.equal(r.guests,2);assert.equal(r.rows[1].customers,2);assert.equal(r.rows[2].customers,2);assert.equal(r.income*12,66);
 const added={...w,buildings:[...w.buildings,at(CAFE.id,0,-4)]};const r2=businessSummary(added);assert.equal(r2.income,r.income);assert.equal(r2.rows.filter(r=>r.kind==='cafe').reduce((n,r)=>n+r.customers,0),2);assert.equal(r2.guests,r.guests);
 assert.equal(businessSummary({...w,buildings:[at(CAFE.id)]}).income,1.5);
 assert.equal(businessSummary({...w,buildings:[w.buildings[0],at(CAFE.id,9,9)]}).rows[1].customers,0);
 assert.equal(hospitalityXP(initialSkills(),r,1).xp.hospitality,6);
 assert.equal(hospitalityXP(initialSkills(),r2,1).xp.hospitality,6);
});
test('café unlock and gentler upgrade costs give measurable early milestones without resetting progress',()=>{
 let s=initialSkills();assert.equal(unlocked(s,'woodland-cafe'),false);s.xp.hospitality=60;assert.equal(unlocked(s,'woodland-cafe'),true);
 assert.equal(BLUEPRINTS[CAFE.id].cost,200);assert.equal(upgradeQuote(upgradeBusiness(at(CABIN.id))).cost,250);assert.equal(upgradeQuote(upgradeBusiness(at(SHOP.id))).cost,275);
 const w=village();const r=businessSummary(w);const earned=hospitalityXP(s,r,Math.ceil((xpForLevel(5)-60)/6));assert.ok(earned.xp.hospitality>=xpForLevel(5));assert.ok(Math.ceil((xpForLevel(5)-60)/6)*5<=230);
 assert.equal(advanceIncome({...w.economy,gold:0},300000,r.income).economy.gold,330);
});
test('café upgrades preserve save identity, customs, XP records, refund basis and entrance clearance',()=>{
 const w=emptyWorld();w.skills.xp.hospitality=xpForLevel(5);let b=at(CAFE.id);b.paidGold=200;b.gameplay.inventory={future:1};w.buildings=[b];
 assert.throws(()=>upgradeBusiness(b,initialSkills()),/Hospitality/);
 let total=0;for(let i=1;i<=3;i++){const quote=upgradeQuote(b);total+=quote.cost;const next=upgradeBusiness(b,w.skills);const after={...w,buildings:[next]};after.skills=developmentXP(w.skills,w,after);Object.assign(w,after);b=next;assert.equal(w.skills.xp.construction,i*80);}
 assert.equal(total,750);assert.equal(removalRefund(b),100);assert.equal(transactGold(w.economy,-total).gold,250);
 const modified=renovateCabin(b,{design:'craftsman',appearance:{exterior:'birch',roof:'slate'}});w.buildings=[modified];assert.equal(modified.id,b.id);assert.equal(modified.gameplay.businessLevel,3);assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))),w);
 for(let rotation=0;rotation<4;rotation++){const c={...b,rotation};assert.equal(placementError(c,emptyWorld()),null);assert.ok(placementError(at(CABIN.id),{...emptyWorld(),buildings:[c]}));assert.equal(entrance(c).length,2);}
});
