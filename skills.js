import {lodgeRecords} from './freeform.js';
// Skill state is independent of Gold and ready for future event/unlock consumers.
export const PROGRESSION=Object.freeze({maxLevel:20,baseXP:60,growth:1.22,maxXP:1_000_000_000});
export const SKILL_DEFINITIONS=Object.freeze({
 cultivation:{name:'Cultivation',description:'Grow your village’s tree count beyond its previous record.'},
 construction:{name:'Construction',description:'Complete buildings and functional business upgrades.'},
 hospitality:{name:'Hospitality',description:'Welcome staying guests and serve shop customers during active play.'},
 conservation:{name:'Conservation',description:'Future habitat activities. No XP source in this milestone.'},
});
export const XP_REWARDS=Object.freeze({treeExpansion:8,buildingCompletion:60,buildingUpgrade:80,guestHosted:1,customerServed:1});
// Reserved hook, deliberately inactive until a genuine habitat system exists.
export const FUTURE_SKILL_EVENTS=Object.freeze({habitatRestored:{skill:'conservation',enabled:false,xp:0}});
export const SKILL_UNLOCKS=Object.freeze([{id:'cedar-exterior',skill:'construction',level:3,kind:'exterior',value:'cedar',name:'Warm cedar'},
 {id:'woodland-cafe',skill:'hospitality',level:2,kind:'building',value:'woodland-cafe',name:'Woodland Café'},
 {id:'business-tier-2',skill:'hospitality',level:3,kind:'business',value:2,name:'Capacity & Expanded Stock'},
 {id:'business-tier-3',skill:'hospitality',level:5,kind:'business',value:3,name:'Premium Retreat & Woodland Outfitters'}]);
const ids=Object.keys(SKILL_DEFINITIONS);
export function xpForLevel(level){
 if(!Number.isInteger(level)||level<1||level>PROGRESSION.maxLevel)throw new Error('Invalid skill level.');
 return Math.floor(PROGRESSION.baseXP*(PROGRESSION.growth**(level-1)-1)/(PROGRESSION.growth-1)+1e-9);
}
export function skillLevel(xp){let level=1;while(level<PROGRESSION.maxLevel&&xp>=xpForLevel(level+1))level++;return level;}
export function skillStatus(xp){
 const level=skillLevel(xp),start=xpForLevel(level),next=level===PROGRESSION.maxLevel?null:xpForLevel(level+1);
 return {level,xp,next,remaining:next===null?0:next-xp,progress:next===null?1:(xp-start)/(next-start)};
}
export function developmentCounts(world){return {trees:Object.values(world.blocks||{}).filter(b=>b.type==='tree').length,buildings:(world.buildings||[]).length+lodgeRecords(world.blocks||{}).length,upgrades:lodgeRecords(world.blocks||{}).reduce((n,b)=>n+b.level,0)+(world.buildings||[]).reduce((n,b)=>n+(b.gameplay?.businessLevel||0)+(b.gameplay?.guestWing?1:0)+(b.gameplay?.frontPorch&&!(b.gameplay.businessLevel>=1)?1:0)+(b.gameplay?.loft&&!(b.gameplay.businessLevel>=2)?1:0),0)};}
export function initialSkills(world={}){return {version:1,xp:Object.fromEntries(ids.map(id=>[id,0])),records:developmentCounts(world)};}
export function normalizeSkills(value,world){
 if(value===undefined)return initialSkills(world);
 if(value?.version!==1||!value.xp||!value.records)throw new Error('Invalid skill progress. Original village retained.');
 const result=initialSkills();
 for(const id of ids){const xp=value.xp[id];if(!Number.isSafeInteger(xp)||xp<0||xp>PROGRESSION.maxXP)throw new Error('Invalid skill XP.');result.xp[id]=xp;}
 for(const key of Object.keys(result.records)){const n=value.records[key];if(!Number.isSafeInteger(n)||n<0||n>1_000_000)throw new Error('Invalid skill activity record.');result.records[key]=n;}
 return result;
}
function award(state,id,amount){
 if(!Number.isSafeInteger(amount)||amount<0)throw new Error('Invalid XP award.');
 state.xp[id]=Math.min(PROGRESSION.maxXP,state.xp[id]+amount);
}
// Persistent count records intentionally survive undo/removal. Growing a replacement
// collection back to its former size cannot repeat XP, even with newly generated IDs.
export function developmentXP(state,before,after){
 const result={...state,xp:{...state.xp},records:{...state.records}},old=developmentCounts(before),next=developmentCounts(after);
 const sources={trees:['cultivation',XP_REWARDS.treeExpansion],buildings:['construction',XP_REWARDS.buildingCompletion],upgrades:['construction',XP_REWARDS.buildingUpgrade]};
 for(const [key,[skill,reward]]of Object.entries(sources)){
  const record=Math.max(state.records[key],old[key]);award(result,skill,Math.max(0,next[key]-record)*reward);result.records[key]=Math.max(record,next[key]);
 }
 return result;
}
// Called once with the same completed active intervals as the Gold transaction.
// No baseline-income XP and no offline clock or separate replayable reward queue.
export function hospitalityXP(state,report,ticks){
 if(!Number.isSafeInteger(ticks)||ticks<0)throw new Error('Invalid hospitality interval.');
 const amount=ticks*(report.guests*XP_REWARDS.guestHosted+report.rows.filter(r=>r.shop).reduce((n,r)=>n+r.customers,0)*XP_REWARDS.customerServed);
 if(!amount)return state;
 const result={...state,xp:{...state.xp}};award(result,'hospitality',amount);return result;
}
export function unlocked(state,id){const item=SKILL_UNLOCKS.find(item=>item.id===id);return !!item&&skillLevel(state.xp[item.skill])>=item.level;}
export function levelGains(before,after){return ids.flatMap(id=>{const previous=skillLevel(before.xp[id]),level=skillLevel(after.xp[id]);return level>previous?[{id,name:SKILL_DEFINITIONS[id].name,level,unlocks:SKILL_UNLOCKS.filter(u=>u.skill===id&&u.level>previous&&u.level<=level)}]:[];});}
