import test from 'node:test';
import assert from 'node:assert/strict';
import {ECONOMY,initialEconomy,normalizeEconomy,transactGold,removalRefund,renovationCost,visitorAppeal,advanceIncome,activeElapsed} from '../economy.js';
import {emptyWorld,cabinAt,validateWorld,renovateCabin} from '../blueprints.js';
test('economy validates balances and upgrades earlier beta worlds without free refunds',()=>{
 const world=emptyWorld();delete world.economy;world.buildings=[cabinAt(0,0)];delete world.buildings[0].paidGold;
 const restored=validateWorld(world);assert.equal(restored.economy.gold,500);assert.equal(removalRefund(restored.buildings[0]),0);
 for(const gold of [-1,NaN,Infinity,1.5,ECONOMY.maxGold+1])assert.throws(()=>normalizeEconomy({version:1,gold,activeMs:0}));
 assert.throws(()=>normalizeEconomy({version:1,gold:500,activeMs:10000}));
});
test('transactions, renovations and inverse undo cannot mint Gold',()=>{
 let e=initialEconomy();const b=cabinAt(0,0);b.paidGold=200;
 e=transactGold(e,-200);assert.equal(e.gold,300);
 const renovated=renovateCabin(b,{design:'woodland',appearance:b.appearance});assert.equal(renovationCost(b,renovated),75);assert.equal(removalRefund(renovated),100);
 assert.equal(renovationCost(b,{...b,appearance:{exterior:'birch',roof:'slate'}}),0);
 e=transactGold(e,100);assert.equal(e.gold,400);e=transactGold(e,-100);e=transactGold(e,200);assert.equal(e.gold,500);
 e=transactGold(e,-200);e=advanceIncome(e,10000,0).economy;e=transactGold(e,200);assert.equal(e.gold,502,'undo retains income');
 assert.throws(()=>transactGold({...e,gold:25},-75));assert.equal(e.gold,502);
});
test('income persists fractional interval without replaying payouts or offline time',()=>{
 let e=advanceIncome(initialEconomy(),15000,15).economy;assert.equal(e.gold,503);assert.equal(e.activeMs,5000);
 e=normalizeEconomy(JSON.parse(JSON.stringify(e)));assert.equal(advanceIncome(e,0,15).earned,0);assert.equal(advanceIncome(e,5000,15).earned,3);
 assert.equal(activeElapsed(0,3600000,false),0);assert.equal(activeElapsed(0,3600000,true),2000);
 assert.equal(advanceIncome({...e,gold:ECONOMY.maxGold-1},5000,75).earned,1);
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
test('paid purchase state and Gold survive save validation',()=>{
 const w=emptyWorld();const b=cabinAt(0,0);b.paidGold=200;w.buildings=[b];w.economy=transactGold(w.economy,-200);
 assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))),w);
});
