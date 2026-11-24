import test from 'node:test';
import assert from 'node:assert/strict';
import {openLodge,freeformLodges,selectedLodge,reconcileLodges,setLodgeLevel,lodgeOpeningError} from '../freeform.js';
import {emptyWorld,validateWorld} from '../blueprints.js';
import {businessSummary,upgradeBusiness} from '../businesses.js';
import {initialSkills,developmentXP} from '../skills.js';
const id='11111111-1111-4111-8111-111111111111';
const house=()=>({type:'house',wood:'oak',roof:'moss'});
const rectangle=(x=0)=>Object.fromEntries([0,1].flatMap(a=>[0,1].map(z=>[`${x+a},0,${z}`,house()])));
const lodge=()=>openLodge(rectangle(),'0,0,0',{},id);
test('Guest Lodge enrollment is explicit, one record per connected structure and survives validation',()=>{
 const w=emptyWorld();w.blocks=rectangle();assert.equal(businessSummary(w).rows.length,0);
 w.blocks=lodge();w.peak=4;assert.equal(freeformLodges(w.blocks).length,1);assert.equal(selectedLodge(w.blocks,'1,0,1').id,id);
 assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))),w);
 assert.throws(()=>openLodge(w.blocks,'1,0,1'));assert.ok(lodgeOpeningError({'0,0,0':house()},'0,0,0'));
 assert.equal(businessSummary(w).rows[0].capacity,2);
});
test('extensions preserve identity and level; anchor removal transfers to surviving rooms',()=>{
 let before=lodge();before=setLodgeLevel(before,freeformLodges(before)[0],2);
 let after=reconcileLodges(before,{...before,'2,0,0':house()});assert.equal(selectedLodge(after,'2,0,0').gameplay.businessLevel,2);
 const removed={...after};delete removed['0,0,0'];after=reconcileLodges(after,removed);
 assert.equal(freeformLodges(after)[0].id,id);assert.equal(freeformLodges(after)[0].gameplay.businessLevel,2);
});
test('splits retain one purchased business and merges of two businesses fail atomically',()=>{
 let before={...rectangle(),...rectangle(3),'2,0,0':house()};before=openLodge(before,'0,0,0',{},id);
 const cut={...before};delete cut['2,0,0'];const after=reconcileLodges(before,cut);
 assert.equal(freeformLodges(after).length,1);assert.equal(selectedLodge(after,'3,0,0'),undefined);
 const second=openLodge(after,'3,0,0',{},'22222222-2222-4222-8222-222222222222');
 assert.throws(()=>reconcileLodges(second,{...second,'2,0,0':house()}),/separate/);
 assert.equal(freeformLodges(second).length,2);
});
test('reduced lodges pause income without losing upgrades; restoring rooms resumes',()=>{
 const w=emptyWorld();w.blocks=lodge();w.blocks=setLodgeLevel(w.blocks,freeformLodges(w.blocks)[0],3);
 const cut={...w.blocks};delete cut['1,0,1'];w.blocks=reconcileLodges(w.blocks,cut);
 let report=businessSummary(w);assert.equal(report.guests,0);assert.equal(report.rows[0].level,3);
 w.blocks=reconcileLodges(w.blocks,{...w.blocks,'1,0,1':house()});assert.ok(businessSummary(w).guests>0);
});
test('freeform upgrades reuse gates and construction high-water XP without undo farming',()=>{
 const before=emptyWorld(),after={...before,blocks:lodge()};let skills=developmentXP(initialSkills(),before,after);assert.equal(skills.xp.construction,60);
 const b=freeformLodges(after.blocks)[0],upgraded=upgradeBusiness(b,skills),next={...after,blocks:setLodgeLevel(after.blocks,b,upgraded.gameplay.businessLevel)};
 skills=developmentXP(skills,after,next);assert.equal(skills.xp.construction,140);assert.equal(developmentXP(skills,after,next).xp.construction,140);
 assert.throws(()=>upgradeBusiness(upgraded,skills),/Hospitality/);
});
test('invalid or duplicated lodge records are rejected rather than corrupting saves',()=>{
 const w={...emptyWorld(),blocks:lodge()};
 assert.throws(()=>validateWorld({...w,blocks:{...w.blocks,'0,0,0':{...w.blocks['0,0,0'],lodge:{id,level:4}}}}));
 const blocks={...w.blocks,...rectangle(4)};blocks['4,0,0'].lodge={id,level:0};assert.throws(()=>validateWorld({...w,blocks}),/Duplicate/);
});
