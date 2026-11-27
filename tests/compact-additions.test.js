import test from 'node:test';import assert from 'node:assert/strict';
import {cabinAt,emptyWorld,validateWorld,withCabinAddition as add,additionQuote,footprint} from '../blueprints.js';
import {businessTier,upgradeQuote,upgradeBusiness,businessSummary} from '../businesses.js';
import {developmentXP,initialSkills} from '../skills.js';
import {createVillageStore} from '../village-store.js';
const world=b=>({...emptyWorld(),buildings:[b]});
const legacy=()=>{const b=cabinAt(0,0);b.gameplay={rearTerrace:true,guestWing:true,businessLevel:2};const w=world(b);w.skills.records.upgrades=3;return w;};
test('terrace retirement refunds exactly once, frees tiles and preserves other purchases',()=>{
 const w=legacy(),next=validateWorld(w);assert.equal(next.economy.gold,1200);assert.equal(next.buildings[0].gameplay.rearTerrace,undefined);assert.equal(next.buildings[0].gameplay.terraceRefunded,true);assert.equal(footprint(next.buildings[0]).length,6);assert.equal(next.buildings[0].id,w.buildings[0].id);assert.deepEqual(validateWorld(next),next);assert.equal(w.economy.gold,1000);
 assert.throws(()=>add(next.buildings[0],'rearTerrace'));
});
test('retirement survives slot persistence and failed writes without duplicate refunds',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};const options={storage,namespace:'test',validate:validateWorld,empty:emptyWorld,migrate:false};let store=createVillageStore(options);store.save(legacy());store.create('Second',legacy());store=createVillageStore(options);assert.equal(store.active.data.economy.gold,1200);const before=data.get('test-slots-guest');const snapshot=store.active.data;
 const set=storage.setItem;storage.setItem=()=>{throw Error('quota');};assert.throws(()=>store.save(snapshot));assert.equal(data.get('test-slots-guest'),before);storage.setItem=set;store.save(snapshot);store=createVillageStore(options);assert.equal(store.active.data.economy.gold,1200);assert.ok(store.list().every(s=>s.data.economy.gold===1200));
});
test('new additions preserve footprint and provide separate benefits with premium credits',()=>{
 const b=cabinAt(0,0),fire=add(b,'fireplace'),luxury=add(fire,'luxury');assert.equal(businessTier(luxury).rate,1);assert.equal(businessSummary(world(fire)).rows[0].quality,1);assert.equal(additionQuote(add(fire,'loft'),'premiumSuite').cost,250);
 assert.equal(additionQuote(b,'premiumLighting').reason,null);const full=add(add(luxury,'loft'),'premiumLighting');assert.deepEqual(footprint(full),footprint(b));assert.equal(businessSummary(world(full)).rows[0].quality,2);assert.deepEqual(validateWorld(world(full)).buildings,[full]);
 const tier={...b,gameplay:{businessLevel:2,fireplace:true}};assert.equal(upgradeQuote(tier).cost,250);const skills={...initialSkills(),xp:{...initialSkills().xp,hospitality:1000}};const upgraded=upgradeBusiness(tier,skills);assert.equal(additionQuote(upgraded,'fireplace').installed,true);
});
test('retired upgrade record preserves XP accounting and invalid flags are rejected',()=>{
 const before=validateWorld(legacy()),after={...before,buildings:[add(before.buildings[0],'luxury')]};const xp=developmentXP(before.skills,before,after);assert.equal(xp.xp.construction,80);assert.equal(developmentXP(xp,before,after).xp.construction,80);
 for(const field of ['fireplace','luxury','premiumLighting','terraceRefunded'])assert.throws(()=>validateWorld(world({...cabinAt(0,0),gameplay:{[field]:'yes'}})));
});

test('legacy roof lookout converts to lighting without changing identity, Gold or XP records',()=>{
 const b=cabinAt(0,0);b.gameplay={loft:true,roofLookout:true};const w=world(b);w.skills.records.upgrades=2;w.skills.xp.construction=160;
 const next=validateWorld(w);assert.equal(next.buildings[0].gameplay.premiumLighting,true);assert.equal(next.buildings[0].gameplay.roofLookout,undefined);assert.equal(next.buildings[0].id,b.id);assert.deepEqual(next.skills,w.skills);assert.deepEqual(next.economy,w.economy);assert.deepEqual(validateWorld(next),next);assert.equal(w.buildings[0].gameplay.roofLookout,true);
 assert.equal(developmentXP(next.skills,next,next).xp.construction,160);
 assert.throws(()=>validateWorld(world({...b,gameplay:{roofLookout:'yes'}})));
});
