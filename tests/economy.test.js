import test from 'node:test';
import assert from 'node:assert/strict';
import {ECONOMY,initialEconomy,normalizeEconomy,transactGold,removalRefund,renovationCost,visitorAppeal,advanceIncome} from '../economy.js';
import {emptyWorld,cabinAt,validateWorld,renovateCabin} from '../blueprints.js';
test('new villages get 1000 Gold; existing balances and interval progress survive migration',()=>{
 assert.equal(initialEconomy().gold,1000);
 const old={version:1,gold:137,activeMs:9000};const upgraded=normalizeEconomy(old);
 assert.deepEqual(upgraded,{version:2,gold:137,activeMs:4500,goldFraction:0});assert.equal(advanceIncome(upgraded,0).earned,0);
 assert.deepEqual(normalizeEconomy(upgraded),upgraded);assert.equal(advanceIncome(upgraded,500).earned,1);
 const world=emptyWorld();delete world.economy;world.buildings=[cabinAt(0,0)];delete world.buildings[0].paidGold;const restored=validateWorld(world);assert.equal(restored.economy.gold,1000);assert.equal(removalRefund(restored.buildings[0]),0);
 for(const gold of [-1,NaN,Infinity,1.5,ECONOMY.maxGold+1])assert.throws(()=>normalizeEconomy({...initialEconomy(),gold}));
 for(const goldFraction of [-1,4,.5])assert.throws(()=>normalizeEconomy({...initialEconomy(),goldFraction}));
 assert.throws(()=>normalizeEconomy({version:1,gold:500,activeMs:10000}));assert.throws(()=>normalizeEconomy({...initialEconomy(),activeMs:5000}));
});
test('five-second payouts carry fractional Gold exactly through saves and rate changes',()=>{
 let e=initialEconomy();assert.equal(advanceIncome(e,4999).earned,0);
 e=advanceIncome(e,5000).economy;assert.equal(e.gold,1001);assert.equal(e.goldFraction,2);
 e=normalizeEconomy(JSON.parse(JSON.stringify(e)));e=advanceIncome(e,5000,2.25).economy;assert.equal(e.gold,1003);assert.equal(e.goldFraction,3);
 e=advanceIncome(e,5000,.75).economy;assert.equal(e.gold,1004);assert.equal(e.goldFraction,2);
 assert.equal(advanceIncome(initialEconomy(),60000).earned,18);
 assert.equal(advanceIncome(initialEconomy(),60000,.75).earned,9);
 assert.equal(advanceIncome(initialEconomy(),60000,4.5).earned,54);
 let repeated=initialEconomy();for(let i=0;i<120;i++)repeated=normalizeEconomy(advanceIncome(repeated,5000,4.5).economy);
 assert.equal(repeated.gold,1540);assert.equal(repeated.goldFraction,0);
 const capped=advanceIncome({...initialEconomy(),gold:ECONOMY.maxGold-1,goldFraction:3},5000,4.5);assert.equal(capped.earned,1);assert.equal(capped.economy.goldFraction,0);
});
test('refunds, renovations and inverse undo preserve earned fractions without minting Gold',()=>{
 let e=initialEconomy();const b=cabinAt(0,0);b.paidGold=200;e=transactGold(e,-200);assert.equal(e.gold,800);
 const renovated=renovateCabin(b,{design:'woodland',appearance:b.appearance});assert.equal(renovationCost(b,renovated),75);assert.equal(removalRefund(renovated),100);
 assert.equal(renovationCost(b,{...b,appearance:{exterior:'birch',roof:'slate'}}),0);
 e=transactGold(e,100);e=transactGold(e,-100);e=advanceIncome(e,5000).economy;e=transactGold(e,200);assert.equal(e.gold,1001);assert.equal(e.goldFraction,2);
 assert.throws(()=>transactGold({...e,gold:25},-75));
});
test('appeal and paid purchase records remain intact',()=>{
 const w=emptyWorld(),b=cabinAt(0,0);b.paidGold=200;w.buildings=[b];w.economy=transactGold(w.economy,-200);assert.equal(visitorAppeal(w).score,5);
 w.water={'2,2':'lake'};assert.equal(visitorAppeal(w).score,7);assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))),w);
});
test('appeal rewards variety and nearby water with bounded repeated decoration',()=>{
 const w=emptyWorld();assert.equal(visitorAppeal(w).score,0);w.buildings=[cabinAt(0,0)];assert.equal(visitorAppeal(w).score,5);
 w.water={'2,2':'lake'};assert.equal(visitorAppeal(w).score,7);
 for(let i=0;i<100;i++)w.blocks[`${i},0,0`]={type:'tree',species:'pine'};
 assert.equal(visitorAppeal(w).parts['Trees & species'],9);
 for(let i=0;i<100;i++)w.blocks[`${i},0,1`]={type:'path'};
 assert.equal(visitorAppeal(w).parts.Paths,6);
 w.buildings.push({...cabinAt(4,0),design:'woodland'});assert.equal(visitorAppeal(w).parts['Architecture variety'],2);
});
