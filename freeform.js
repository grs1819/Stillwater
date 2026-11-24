import {architecturePlan,entrancePlan,assignRole} from './town.js?v=freeform-lodge-1';
export const LODGE_COST=200;
export function freeformGroups(blocks){
 const groups=new Map();for(const [key,form] of architecturePlan(blocks)){if(!groups.has(form))groups.set(form,[]);groups.get(form).push(key);}
 return [...groups.values()].map(keys=>keys.sort());
}
export function lodgeRecords(blocks){return Object.entries(blocks).filter(([,b])=>b.lodge).map(([anchor,b])=>({anchor,...b.lodge}));}
// One persisted record per connected business; geometry and membership remain derived.
export function freeformLodges(blocks,water={}){
 if(!Object.values(blocks).some(b=>b.lodge))return [];
 const entries=entrancePlan(blocks,water);
 return freeformGroups(blocks).flatMap(keys=>{
  const records=keys.filter(k=>blocks[k].lodge);if(!records.length)return [];
  if(records.length>1)throw new Error('Keep operating lodges separate.');
  const anchor=records[0],record=blocks[anchor].lodge,ground=keys.filter(k=>k.split(',')[1]==='0'),entry=ground.map(k=>entries.get(k)).find(Boolean);
  const coords=ground.map(k=>k.split(',').map(Number)),pos=coords.length?[coords.reduce((s,c)=>s+c[0],0)/coords.length,coords.reduce((s,c)=>s+c[2],0)/coords.length]:[0,0];
  const door=entry?entry.k.split(',').map(Number):null;
  return [{id:record.id,blueprint:'freeform-lodge',anchor,keys,position:pos,entry,door:door?[door[0]+entry.dx,door[2]+entry.dz]:null,operating:ground.length>=4&&!!entry,gameplay:{businessLevel:record.level}}];
 });
}
export function selectedLodge(blocks,key,water={}){return freeformLodges(blocks,water).find(b=>b.keys.includes(key));}
export function lodgeOpeningError(blocks,key,water={}){
 const group=freeformGroups(blocks).find(keys=>keys.includes(key));
 if(!group)return 'Select a freeform building.';
 if(group.some(k=>blocks[k].lodge))return 'This building already operates as a Guest Lodge.';
 if(group.filter(k=>k.split(',')[1]==='0').length<4)return 'Build at least four ground-floor rooms to open a Guest Lodge.';
 const entries=entrancePlan(blocks,water);
 if(!group.some(k=>entries.has(k)))return 'Leave an accessible ground-floor entrance.';
 return null;
}
export function openLodge(blocks,key,water={},id=crypto.randomUUID()){
 const error=lodgeOpeningError(blocks,key,water);if(error)throw new Error(error);
 const next=assignRole(blocks,key,'inn');next[key].lodge={id,level:0};return next;
}
// Transfer a deleted anchor to surviving rooms. Splits retain one business only;
// merges of two businesses are rejected rather than discarding paid upgrades.
export function reconcileLodges(before,after){
 const groups=freeformGroups(after),owners=new Map(),previous=freeformLodges(before);
 for(const old of previous){
  const survivors=groups.map(keys=>({keys,count:keys.filter(k=>old.keys.includes(k)).length})).filter(g=>g.count).sort((a,b)=>Number(b.keys.includes(old.anchor))-Number(a.keys.includes(old.anchor))||b.count-a.count||a.keys[0].localeCompare(b.keys[0]));
  if(!survivors.length)continue;
  const keys=survivors[0].keys;if(owners.has(keys))throw new Error('Keep operating lodges separate. Leave a gap between their rooms.');owners.set(keys,old);
 }
 const next={...after};
 for(const keys of groups){
  const old=owners.get(keys),newRecords=keys.filter(k=>after[k].lodge);
  if(!old){if(newRecords.length>1)throw new Error('Keep operating lodges separate.');continue;}
  const anchor=keys.includes(old.anchor)?old.anchor:keys.filter(k=>old.keys.includes(k))[0];
  const record=newRecords.map(k=>after[k].lodge).find(r=>r.id===old.id)||before[old.anchor].lodge;
  for(const k of keys){next[k]={...after[k],role:'inn'};delete next[k].lodge;}
  next[anchor].lodge={...record};
 }
 return next;
}
export function setLodgeLevel(blocks,lodge,level){return {...blocks,[lodge.anchor]:{...blocks[lodge.anchor],lodge:{id:lodge.id,level}}};}
