import test from 'node:test';
import assert from 'node:assert/strict';
import {PROGRESSION,XP_REWARDS,initialSkills,normalizeSkills,skillLevel,skillStatus,xpForLevel,developmentXP,hospitalityXP,unlocked,levelGains,FUTURE_SKILL_EVENTS} from '../skills.js';
import {emptyWorld,cabinAt,validateWorld,renovateCabin} from '../blueprints.js';
import {upgradeBusiness,businessSummary} from '../businesses.js';
import {advanceIncome,transactGold} from '../economy.js';
const tree=(w,n)=>({...w,blocks:Object.fromEntries(Array.from({length:n},(_,i)=>[`${i},0,4`,{type:'tree',species:'pine'}]))});
test('levels 1–20 use exact configurable thresholds and cap display, not future XP',()=>{
 assert.equal(xpForLevel(1),0);assert.equal(xpForLevel(2),60);assert.equal(xpForLevel(3),133);
 for(let level=2;level<=20;level++){const xp=xpForLevel(level);assert.equal(skillLevel(xp-1),level-1);assert.equal(skillLevel(xp),level);assert.equal(skillStatus(xp).progress,level===20?1:0);}
 assert.equal(skillStatus(xpForLevel(20)+500).next,null);assert.equal(skillLevel(PROGRESSION.maxXP),20);
 assert.throws(()=>xpForLevel(21));assert.throws(()=>xpForLevel(1.5));
});
test('planting rewards village growth once, surviving removal, replacement, undo and reload',()=>{
 const w=emptyWorld(),grown=tree(w,3);let s=developmentXP(w.skills,w,grown);assert.equal(s.xp.cultivation,24);assert.equal(s.xp.conservation,0);
 s=developmentXP(s,grown,w);assert.equal(s.records.trees,3);s=normalizeSkills(JSON.parse(JSON.stringify(s)),w);
 for(let i=0;i<10;i++){s=developmentXP(s,w,grown);s=developmentXP(s,grown,w);}assert.equal(s.xp.cultivation,24);
 // Undo never restores skill state; a different species/location still cannot farm XP.
 const replacement={...tree(w,3),blocks:{'3,0,5':{type:'tree',species:'birch'},'4,0,5':{type:'tree',species:'larch'},'5,0,5':{type:'tree',species:'redwood'}}};
 s=developmentXP(s,w,replacement);assert.equal(s.xp.cultivation,24);s=developmentXP(s,replacement,tree(w,4));assert.equal(s.xp.cultivation,32);
});
test('construction and upgrades award progress rather than expenditure or new IDs',()=>{
 const w=emptyWorld(),b=cabinAt(0,0),built={...w,buildings:[b]};let s=developmentXP(w.skills,w,built);assert.equal(s.xp.construction,60);assert.equal(unlocked(s,'cedar-exterior'),false);
 const upgraded={...built,buildings:[upgradeBusiness(b)]};s=developmentXP(s,built,upgraded);assert.equal(s.xp.construction,140);assert.ok(unlocked(s,'cedar-exterior'));
 const cosmetic={...upgraded,buildings:[renovateCabin(upgraded.buildings[0],{design:'woodland',appearance:{exterior:'cedar',roof:'slate'}})]};s=developmentXP(s,upgraded,cosmetic);assert.equal(s.xp.construction,140);
 s=developmentXP(s,cosmetic,w);for(let i=0;i<5;i++){const fresh={...w,buildings:[upgradeBusiness(cabinAt(0,0))]};s=developmentXP(s,w,fresh);s=developmentXP(s,fresh,w);}assert.equal(s.xp.construction,140);
 assert.equal(s.xp.hospitality,0);assert.equal(s.xp.conservation,0);
});
test('old villages baseline their existing development records without retroactive XP',()=>{
 const w=tree(emptyWorld(),5);w.buildings=[upgradeBusiness(cabinAt(-4,0))];delete w.skills;
 const migrated=validateWorld(w);assert.deepEqual(migrated.skills.records,{trees:5,buildings:1,upgrades:1});assert.deepEqual(migrated.skills.xp,initialSkills().xp);
 const cleared={...emptyWorld(),skills:migrated.skills};const recorded=developmentXP(migrated.skills,migrated,cleared);assert.equal(developmentXP(recorded,cleared,migrated).xp.construction,0);
 assert.equal(validateWorld({...migrated,skills:undefined}).buildings[0].id,w.buildings[0].id);
});
test('hospitality follows active customers and guests, not Gold, cosmetics or empty shops',()=>{
 const s=initialSkills();assert.equal(hospitalityXP(s,{guests:0,rows:[]},20),s);
 const report={guests:2,rows:[{shop:false,customers:0},{shop:true,customers:2}]};const earned=hospitalityXP(s,report,3);assert.equal(earned.xp.hospitality,12);
 assert.equal(hospitalityXP(earned,report,0),earned);assert.equal(earned.xp.conservation,0);assert.equal(s.xp.hospitality,0);
 assert.equal(FUTURE_SKILL_EVENTS.habitatRestored.enabled,false);assert.throws(()=>hospitalityXP(s,report,-1));
});
test('save validation retains skills, IDs and fractional Gold; invalid skill saves are rejected',()=>{
 const w=emptyWorld(),b=cabinAt(0,0);const next={...w,buildings:[b],economy:transactGold(w.economy,-200)};next.skills=developmentXP(w.skills,w,next);
 const report=businessSummary(next),payout=advanceIncome(next.economy,7500,report.income);next.economy=payout.economy;next.skills=hospitalityXP(next.skills,report,payout.ticks);
 const loaded=validateWorld(JSON.parse(JSON.stringify(next)));assert.deepEqual(loaded,next);assert.equal(loaded.buildings[0].id,b.id);assert.equal(loaded.skills.xp.hospitality,1);
 assert.equal(advanceIncome(loaded.economy,0,report.income).ticks,0);
 for(const value of [-1,1.2,Infinity,'60',null,PROGRESSION.maxXP+1])assert.throws(()=>normalizeSkills({...next.skills,xp:{...next.skills.xp,construction:value}},next));
 assert.throws(()=>normalizeSkills({...next.skills,records:{...next.skills.records,trees:-1}},next));assert.throws(()=>normalizeSkills({...next.skills,version:99},next));
});
test('level feedback reports crossed levels and unlocks only once',()=>{
 const before=initialSkills(),after={...before,xp:{...before.xp,construction:140}};const gains=levelGains(before,after);
 assert.equal(gains.length,1);assert.equal(gains[0].level,3);assert.equal(gains[0].unlocks[0].id,'cedar-exterior');assert.deepEqual(levelGains(after,after),[]);assert.equal(unlocked(after,'nonexistent'),false);
});
