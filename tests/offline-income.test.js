import test from 'node:test';
import assert from 'node:assert/strict';
import {settleIncome,businessSummary} from '../businesses.js';
import {emptyWorld,buildingAt,CABIN,SHOP,validateWorld} from '../blueprints.js';
import {createVillageStore} from '../village-store.js';
const start=1_800_000_000_000;
function world(){const w=emptyWorld();w.buildings=[buildingAt(CABIN.id,0,0),buildingAt(SHOP.id,4,0)];w.blocks['0,0,2']={type:'path'};return validateWorld(w);}
const settle=(w,t)=>{const r=settleIncome(w.economy,w.skills,businessSummary(w),t);return {result:r,world:{...w,economy:r.economy,skills:r.skills}};};
test('legacy villages gain a checkpoint, not retroactive rewards; timestamp survives validation',()=>{
 const w=world(),{result,world:next}=settle(w,start);assert.equal(result.earned,0);assert.equal(result.elapsed,0);assert.equal(next.economy.gold,1000);assert.equal(next.economy.lastIncomeAt,start);assert.deepEqual(validateWorld(next),next);
 for(const lastIncomeAt of [-1,1.5,Infinity,'2026',null,9e15])assert.throws(()=>validateWorld({...w,economy:{...w.economy,lastIncomeAt}}));
});
test('uncapped 24-hour and 365-day earnings include Gold and only actual Hospitality activity',()=>{
 const w=settle(world(),start).world;
 for(const hours of [4,24,24*365]){const {result,world:next}=settle(w,start+hours*3600000);assert.equal(result.elapsed,hours*3600000);assert.equal(result.earned,hours*60*54);assert.equal(next.skills.xp.hospitality,hours*60*48);assert.equal(next.skills.xp.construction,0);assert.equal(next.skills.xp.conservation,0);}
 const empty=settle(emptyWorld(),start).world,result=settle(empty,start+3600000);assert.equal(result.result.earned,18*60);assert.equal(result.world.skills.xp.hospitality,0);
});
test('reload, repeated resume and backward clocks never replay payouts; fractions and partial intervals remain exact',()=>{
 let w=settle(world(),start).world;w=settle(w,start+7500).world;assert.equal(w.economy.gold,1004);assert.equal(w.economy.goldFraction,2);assert.equal(w.economy.activeMs,2500);
 w=validateWorld(JSON.parse(JSON.stringify(w)));assert.deepEqual(settle(w,start+7500).world,w);assert.deepEqual(settle(w,start-10000).world,w);
 w=settle(w,start+10000).world;assert.equal(w.economy.gold,1009);assert.equal(w.economy.goldFraction,0);assert.equal(w.skills.xp.hospitality,8);
});
test('old business rates settle before upgrading and the next interval uses new state',()=>{
 let w=settle(world(),start).world;w=settle(w,start+3600000).world;assert.equal(w.economy.gold,4240);
 w.buildings=w.buildings.map(b=>({...b,gameplay:{businessLevel:3}}));const rate=businessSummary(w).income;const after=settle(w,start+3605000).world;assert.equal(after.economy.gold,w.economy.gold+Math.floor(rate));assert.equal(after.economy.lastIncomeAt,start+3605000);
});
test('failed writes and stale tabs cannot commit duplicate income; retry starts at last durable checkpoint',()=>{
 const map=new Map();let fail=false;const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{if(fail)throw new Error('Quota');map.set(k,v);}};
 const options={storage,namespace:'offline-test',migrate:false,validate:validateWorld,empty:()=>settle(world(),start).world};
 const first=createVillageStore(options),stale=createVillageStore(options),initial=first.active.data;
 const next=settle(initial,start+86400000).world;fail=true;assert.throws(()=>first.save(next),/Quota/);assert.deepEqual(first.active.data,initial);fail=false;
 first.save(next);assert.throws(()=>stale.save(settle(stale.active.data,start+86400000).world),/Another tab/);
 const loaded=createVillageStore(options);assert.deepEqual(settle(loaded.active.data,start+86400000).world,next);
});
test('inactive village slots accrue independently without changing another slot',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const store=createVillageStore({storage,namespace:'offline-slots',migrate:false,validate:validateWorld,empty:()=>settle(world(),start).world});
 const a=store.active.id,b=store.create('Second').id;store.save(settle(store.active.data,start+3600000).world);const second=store.active.data;store.select(a);assert.equal(store.active.data.economy.lastIncomeAt,start);store.save(settle(store.active.data,start+7200000).world);assert.equal(store.active.data.economy.gold,7480);store.select(b);assert.deepEqual(store.active.data,second);
});
