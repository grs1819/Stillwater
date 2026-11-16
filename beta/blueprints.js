import {ECONOMY,initialEconomy,normalizeEconomy,validatePaidGold} from './economy.js';
import {LIMIT,key,normalize} from './town.js';
import {levelSite,terrainLevel} from './terrain.js';
export const CABIN=Object.freeze({id:'timber-guest-cabin',version:1,design:'gable',width:2,depth:2,entrance:[0,2]});
// Stable IDs: gable is the original Frontier design, so existing 2.0 saves remain valid.
export const DESIGNS=Object.freeze({
 gable:Object.freeze({name:'Frontier Cabin',version:1,peak:2.22,wallWidth:1.82,eave:.49,renovationCost:ECONOMY.renovationCost,constructionLevel:0}),
 woodland:Object.freeze({name:'Woodland Cottage',version:1,peak:2.78,wallWidth:1.78,eave:.49,renovationCost:ECONOMY.renovationCost,constructionLevel:0}),
 craftsman:Object.freeze({name:'Craftsman Lodge',version:1,peak:2.08,wallWidth:1.62,eave:.49,renovationCost:ECONOMY.renovationCost,constructionLevel:0}),
});
export const EXTERIORS={honey:{wall:'#c6a171',frame:'#796044'},birch:{wall:'#ded4b3',frame:'#716655'}};
export const FINISHES={moss:{color:'#718a58',tier:'cottage'},slate:{color:'#718b94',tier:'estate'}};
export const emptyWorld=()=>({schemaVersion:2,blocks:{},water:{},terrain:{},peak:0,buildings:[],economy:initialEconomy()});
export function cabinAt(x,z,rotation=0,appearance={exterior:'honey',roof:'moss'},id=crypto.randomUUID()){
 return {id,blueprint:CABIN.id,definitionVersion:1,design:CABIN.design,position:[x===0?0:x,z===0?0:z],rotation,appearance:{...appearance},paidGold:0,gameplay:{}};
}
export function localCell(b,x,z){const [a,c]=b.position;return [[a+x,c+z],[a+z,c-x],[a-x,c-z],[a-z,c+x]][b.rotation];}
export function footprint(b){return [[0,0],[1,0],[0,1],[1,1]].map(([x,z])=>localCell(b,x,z));}
export const entrance=b=>localCell(b,...CABIN.entrance);
export function cabinOccupancy(buildings,includeEntrance=false){const out=new Map();for(const b of buildings)for(const [x,z]of [...footprint(b),...(includeEntrance?[entrance(b)]:[])])out.set(`${x},${z}`,b.id);return out;}
export function placementError(b,world){
 const occupied=cabinOccupancy(world.buildings.filter(other=>other.id!==b.id),true),cells=footprint(b),door=entrance(b),height=terrainLevel(world.terrain,...b.position);
 for(const [x,z]of [...cells,door]){
  if(Math.abs(x)>LIMIT||Math.abs(z)>LIMIT)return 'Keep the cabin and its entrance inside the clearing.';
  if(occupied.has(`${x},${z}`))return 'Leave room for neighboring cabins and entrances.';
  if(world.water[`${x},${z}`])return 'Cabins need dry land and a dry entrance.';
  if(!levelSite(world.terrain,x,z)||terrainLevel(world.terrain,x,z)!==height)return 'Level the cabin site and entrance first.';
  for(let y=0;y<8;y++){
   const block=world.blocks[key(x,y,z)];
   if(block&&!(x===door[0]&&z===door[1]&&y===0&&block.type==='path'))return 'Clear the footprint and entrance before building.';
  }
 }
 return null;
}
export function customizeCabin(b,appearance){
 if(!Object.hasOwn(EXTERIORS,appearance.exterior)||!Object.hasOwn(FINISHES,appearance.roof))throw new Error('Unknown cabin finish.');
 return {...b,appearance:{exterior:appearance.exterior,roof:appearance.roof}};
}
// Architectural changes are priced here; finish-only changes remain free.
export function renovationQuote(design){
 if(!Object.hasOwn(DESIGNS,design))throw new Error('Unknown architectural design.');
 return {cost:DESIGNS[design].renovationCost,constructionLevel:DESIGNS[design].constructionLevel};
}
export function renovateCabin(b,{design=b.design,appearance=b.appearance}={}){
 renovationQuote(design);
 return {...customizeCabin(b,appearance),design};
}
export function validateWorld(value){
 if(value?.schemaVersion!==2||!Array.isArray(value.buildings)||value.buildings.length>100||!value.blocks||typeof value.blocks!=='object'||Array.isArray(value.blocks))throw new Error('Choose a Stillwater 2.0 village file.');
 if(JSON.stringify(value).length>2_000_000)throw new Error('This village is too large.');
 const world={...normalize(value),schemaVersion:2,buildings:[],economy:normalizeEconomy(value.economy)},ids=new Set();
 for(const input of value.buildings){
  if(!input||typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)||ids.has(input.id)||input.blueprint!==CABIN.id||input.definitionVersion!==1||!Object.hasOwn(DESIGNS,input.design)||!Array.isArray(input.position)||input.position.length!==2||!input.position.every(Number.isInteger)||![0,1,2,3].includes(input.rotation)||!input.gameplay||typeof input.gameplay!=='object'||Array.isArray(input.gameplay))throw new Error('Unsupported or invalid building. Original save retained.');
  const b=renovateCabin(cabinAt(...input.position,input.rotation,input.appearance,input.id),{design:input.design,appearance:input.appearance||{}});b.gameplay=structuredClone(input.gameplay);b.paidGold=validatePaidGold(input.paidGold);
  const error=placementError(b,world);if(error)throw new Error(error);
  ids.add(b.id);world.buildings.push(b);
 }
 return world;
}
// Derived obstruction data is never saved as a second copy of a cabin.
export function navigationBlocks(blocks,buildings,protectEntrance=false){const result={...blocks};for(const b of buildings)for(const [x,z]of [...footprint(b),...(protectEntrance?[entrance(b)]:[])])result[key(x,0,z)]={type:'house'};return result;}
