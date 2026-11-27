import {freeformLodges} from './freeform.js';
import {initialSkills,normalizeSkills} from './skills.js?v=cabin-lighting-1';
import {ECONOMY,initialEconomy,normalizeEconomy,validatePaidGold} from './economy.js';
import {LIMIT,key,normalize} from './town.js?v=freeform-lodge-1';
import {levelSite,terrainLevel} from './terrain.js';
export const CABIN=Object.freeze({id:'timber-guest-cabin',version:1,design:'gable',width:2,depth:2,entrance:[0,2]});
export const GUEST_WING=Object.freeze({cost:250,beds:2,cells:[[0,-1],[1,-1]]});
export const CABIN_ADDITIONS=Object.freeze({guestWing:{name:'Guest wing',cost:250,hospitality:1},frontPorch:{name:'Full-width porch',cost:150,hospitality:1},loft:{name:'Dormer loft conversion',cost:250,hospitality:3},secondStory:{name:'Second story',cost:650,hospitality:5},premiumSuite:{name:'Premium suite',cost:450,hospitality:5},fireplace:{name:'Stone fireplace',cost:200,hospitality:2},luxury:{name:'Luxury renovation',cost:250,hospitality:3},premiumLighting:{name:'Premium lighting',cost:300,hospitality:5}});
export const hasLoft=b=>!!b.gameplay.loft||(b.gameplay.businessLevel||0)>=2;
export function additionQuote(b,kind){
 if(b.blueprint!==CABIN.id||!CABIN_ADDITIONS[kind])throw new Error('Unsupported cabin addition.');
 const item=CABIN_ADDITIONS[kind],level=b.gameplay.businessLevel||0;
 const reason=kind==='premiumSuite'&&!hasLoft(b)?'Convert the loft or add a second story first.':null;
 return {...item,reason,cost:kind==='premiumSuite'&&b.gameplay.fireplace?item.cost-200:kind==='secondStory'&&hasLoft(b)?item.cost-250:kind==='frontPorch'&&level>=1||kind==='loft'&&level>=2?0:item.cost,installed:kind==='loft'?hasLoft(b):kind==='premiumSuite'?(level>=3||!!b.gameplay.premiumSuite):kind==='fireplace'?(level>=3||!!b.gameplay.premiumSuite||!!b.gameplay.fireplace):!!b.gameplay[kind]};
}
export function withCabinAddition(b,kind){
 const quote=additionQuote(b,kind);if(quote.reason)throw new Error(quote.reason);
 if(quote.installed)throw new Error('This addition is already installed.');
 return {...b,gameplay:{...b.gameplay,...(kind==='secondStory'?{loft:true}:{}),[kind]:true}};
}
export const withGuestWing=b=>withCabinAddition(b,'guestWing');
export const SHOP=Object.freeze({...CABIN,id:'supply-shop'});
export const CAFE=Object.freeze({...CABIN,id:'woodland-cafe'});
export const SAUNA=Object.freeze({...CABIN,id:'woodland-sauna'});
export const BLUEPRINTS=Object.freeze({[SAUNA.id]:Object.freeze({...SAUNA,name:'Woodland Sauna',cost:300}),[CAFE.id]:Object.freeze({...CAFE,name:'Woodland Café',cost:ECONOMY.cafeCost}),[CABIN.id]:Object.freeze({...CABIN,name:'Timber Guest Cabin',cost:ECONOMY.cabinCost}),[SHOP.id]:Object.freeze({...SHOP,name:'Supply Shop',cost:ECONOMY.shopCost})});
// Stable IDs: gable is the original Frontier design, so existing 2.0 saves remain valid.
export const DESIGNS=Object.freeze({
 gable:Object.freeze({name:'Frontier Cabin',version:1,peak:2.22,wallWidth:1.82,eave:.49,renovationCost:ECONOMY.renovationCost,constructionLevel:0}),
 woodland:Object.freeze({name:'Woodland Cottage',version:1,peak:2.78,wallWidth:1.78,eave:.49,renovationCost:ECONOMY.renovationCost,constructionLevel:0}),
 craftsman:Object.freeze({name:'Craftsman Lodge',version:1,peak:2.08,wallWidth:1.62,eave:.49,renovationCost:ECONOMY.renovationCost,constructionLevel:0}),
});
export const EXTERIORS={honey:{wall:'#c6a171',frame:'#796044'},birch:{wall:'#ded4b3',frame:'#716655'},cedar:{wall:'#b77d61',frame:'#72533e'}};
export const FINISHES={moss:{color:'#718a58',tier:'cottage'},slate:{color:'#718b94',tier:'estate'}};
export const emptyWorld=()=>({schemaVersion:2,blocks:{},water:{},terrain:{},peak:0,buildings:[],economy:initialEconomy(),skills:initialSkills()});
export function cabinAt(x,z,rotation=0,appearance={exterior:'honey',roof:'moss'},id=crypto.randomUUID()){
 return {id,blueprint:CABIN.id,definitionVersion:1,design:CABIN.design,position:[x===0?0:x,z===0?0:z],rotation,appearance:{...appearance},paidGold:0,gameplay:{}};
}
export function buildingAt(blueprint,x,z,rotation=0,appearance,id){
 if(!Object.hasOwn(BLUEPRINTS,blueprint))throw new Error('Unknown building type.');
 return {...cabinAt(x,z,rotation,appearance,id),blueprint};
}
export function localCell(b,x,z){const [a,c]=b.position;return [[a+x,c+z],[a+z,c-x],[a-x,c-z],[a-z,c+x]][b.rotation];}
export function footprint(b){return [[0,0],[1,0],[0,1],[1,1],...(b.gameplay.guestWing?GUEST_WING.cells:[]),...(b.gameplay.frontPorch?[[0,2],[1,2]]:[])].map(([x,z])=>localCell(b,x,z));}
export const entrance=b=>localCell(b,...CABIN.entrance);
export function cabinOccupancy(buildings,includeEntrance=false){const out=new Map();for(const b of buildings)for(const [x,z]of [...footprint(b),...(includeEntrance?[entrance(b)]:[])])out.set(`${x},${z}`,b.id);return out;}
export function placementError(b,world){
 const occupied=cabinOccupancy(world.buildings.filter(other=>other.id!==b.id),true),cells=footprint(b),door=entrance(b),height=terrainLevel(world.terrain,...b.position);
 for(const [x,z]of [...cells,door]){
  if(Math.abs(x)>LIMIT||Math.abs(z)>LIMIT)return 'Keep the building and its entrance inside the clearing.';
  if(occupied.has(`${x},${z}`))return 'Leave room for neighboring buildings and entrances.';
  if(world.water[`${x},${z}`])return 'Buildings need dry land and a dry entrance.';
  if(!levelSite(world.terrain,x,z)||terrainLevel(world.terrain,x,z)!==height)return 'Level the building site and entrance first.';
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
  if(!input||typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)||ids.has(input.id)||!Object.hasOwn(BLUEPRINTS,input.blueprint)||input.definitionVersion!==1||!Object.hasOwn(DESIGNS,input.design)||!Array.isArray(input.position)||input.position.length!==2||!input.position.every(Number.isInteger)||![0,1,2,3].includes(input.rotation)||!input.gameplay||typeof input.gameplay!=='object'||Array.isArray(input.gameplay))throw new Error('Unsupported or invalid building. Original save retained.');
  const b=renovateCabin(buildingAt(input.blueprint,...input.position,input.rotation,input.appearance,input.id),{design:input.design,appearance:input.appearance||{}});b.gameplay=structuredClone(input.gameplay);b.paidGold=validatePaidGold(input.paidGold);
  if(b.gameplay.businessLevel!==undefined&&!(b.blueprint===SAUNA.id?[0,1,2,3,4,5]:[0,1,2,3]).includes(b.gameplay.businessLevel))throw new Error('Invalid business upgrade.');
  for(const field of ['frontPorch','loft','secondStory','premiumSuite','rearTerrace','terraceRefunded','fireplace','luxury','premiumLighting','roofLookout'])if(b.gameplay[field]!==undefined&&(b.blueprint!==CABIN.id||typeof b.gameplay[field]!=='boolean'))throw new Error('Invalid cabin addition.');
  if(b.gameplay.guestWing!==undefined&&(b.blueprint!==CABIN.id||typeof b.gameplay.guestWing!=='boolean'))throw new Error('Invalid guest wing.');
  if(b.gameplay.rearTerrace){if(!b.gameplay.terraceRefunded)world.economy.gold=Math.min(ECONOMY.maxGold,world.economy.gold+200);b.gameplay.terraceRefunded=true;}
  delete b.gameplay.rearTerrace;
  if(b.gameplay.roofLookout)b.gameplay.premiumLighting=true;
  delete b.gameplay.roofLookout;
  if((b.gameplay.secondStory||b.gameplay.premiumSuite)&&!hasLoft(b))throw new Error('Upper accommodation needs a loft.');
  const error=placementError(b,world);if(error)throw new Error(error);
  ids.add(b.id);world.buildings.push(b);
 }
 for(const lodge of freeformLodges(world.blocks,world.water)){if(ids.has(lodge.id))throw new Error('Duplicate building identity.');ids.add(lodge.id);}
 world.skills=normalizeSkills(value.skills,world);
 return world;
}
// Derived obstruction data is never saved as a second copy of a cabin.
export function navigationBlocks(blocks,buildings,protectEntrance=false){const result={...blocks};for(const b of buildings)for(const [x,z]of [...footprint(b),...(protectEntrance?[entrance(b)]:[])])result[key(x,0,z)]={type:'house'};return result;}
