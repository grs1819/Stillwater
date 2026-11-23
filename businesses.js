import {SHOP,entrance,footprint} from './blueprints.js';
import {ECONOMY,visitorAppeal} from './economy.js';
import {skillLevel} from './skills.js';
// Abstract occupancy: deterministic, derived from the village, and never accrued offline.
export const BUSINESS=Object.freeze({baseDemand:2,appealPerGuest:10,shopRadius:6,cabinCapacity:[2,4,6,6],shopCapacity:[4,8,10,12],cabinUpgrade:150,shopUpgrade:175,goldPerGuest:.75,goldPerCustomer:.75});
// Each tier is a purchase, not an architectural renovation. Existing tier 1 benefits remain intact.
export const BUSINESS_TIERS=Object.freeze({
 cabin:[
  {name:'Guest Cabin',capacity:2,rate:.75},
  {name:'Comfort',cost:150,hospitality:1,capacity:4,rate:.75,visual:'Sheltered entrance, lanterns, flower boxes and a porch bench.'},
  {name:'Capacity',cost:300,hospitality:3,capacity:6,rate:1,visual:'Raised roof and twin dormers create a spacious guest loft.'},
  {name:'Premium Retreat',cost:600,hospitality:5,capacity:6,rate:1.5,visual:'Glazed timber gable, recessed balcony, stone base and chimney.'},
 ],
 shop:[
  {name:'Supply Shop',capacity:4,rate:.75},
  {name:'Better Displays',cost:175,hospitality:1,capacity:8,rate:.75,visual:'Stocked corner windows, a full canopy and outdoor display shelf.'},
  {name:'Expanded Stock',cost:350,hospitality:3,capacity:10,rate:1,visual:'Raised roof windows, deeper timber canopy and camping displays.'},
  {name:'Woodland Outfitters',cost:650,hospitality:5,capacity:12,rate:1.5,visual:'Grand timber portico, stepped gable, stone piers and outfitter sign.'},
 ],
});
export const businessTier=b=>BUSINESS_TIERS[b.blueprint===SHOP.id?'shop':'cabin'][b.gameplay.businessLevel||0];
export const upgradeQuote=b=>BUSINESS_TIERS[b.blueprint===SHOP.id?'shop':'cabin'][(b.gameplay.businessLevel||0)+1]||null;
export function upgradeError(b,skills){
 const quote=upgradeQuote(b);if(!quote)return 'This business is fully upgraded.';
 if(skillLevel(skills?.xp?.hospitality||0)<quote.hospitality)return `Requires Hospitality level ${quote.hospitality}.`;
 return null;
}
export function upgradeBusiness(b,skills){
 const error=upgradeError(b,skills);if(error)throw new Error(error);
 return {...b,gameplay:{...b.gameplay,businessLevel:(b.gameplay.businessLevel||0)+1}};
}
const center=b=>{const cells=footprint(b);return [cells.reduce((n,c)=>n+c[0],0)/4,cells.reduce((n,c)=>n+c[1],0)/4];};
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
export function businessSummary(world){
 const appeal=visitorAppeal(world),demand=BUSINESS.baseDemand+Math.floor(appeal.score/BUSINESS.appealPerGuest);
 const scenery=[...Object.keys(world.water).map(k=>k.split(',').map(Number)),...Object.entries(world.blocks).filter(([,b])=>b.type==='tree'||b.type==='campProp').map(([k])=>{const [x,,z]=k.split(',').map(Number);return [x,z];})];
 const rows=world.buildings.map(b=>{
  const shop=b.blueprint===SHOP.id,level=b.gameplay.businessLevel||0,pos=center(b),door=entrance(b);
  const path=world.blocks[`${door[0]},0,${door[1]}`]?.type==='path',nature=scenery.some(p=>distance(p,pos)<=9),capacity=businessTier(b).capacity,rate=businessTier(b).rate;
  return {id:b.id,shop,pos,capacity,rate,level,path,nature,quality:Number(path)+Number(nature)+level,available:Math.min(capacity,1+Number(path)+Number(nature)+level),guests:0,customers:0,lodgings:0,income:0,hint:''};
 });
 const cabins=rows.filter(r=>!r.shop).sort((a,b)=>b.quality-a.quality||a.id.localeCompare(b.id)),shops=rows.filter(r=>r.shop);
 let remaining=demand;
 // Distribute one guest per cabin per round; attractive lodgings win ties.
 for(let round=0;remaining&&round<Math.max(0,...cabins.map(r=>r.available));round++)for(const row of cabins)if(remaining&&row.guests<row.available){row.guests++;remaining--;}
 for(const row of cabins){
  let unserved=row.guests;
  const nearby=shops.filter(s=>distance(s.pos,row.pos)<=BUSINESS.shopRadius**2).sort((a,b)=>distance(a.pos,row.pos)-distance(b.pos,row.pos)||a.id.localeCompare(b.id));
  for(const shop of nearby){const count=Math.min(unserved,shop.capacity-shop.customers);if(count){shop.customers+=count;shop.lodgings++;unserved-=count;}}
  row.income=row.guests*row.rate;
  row.hint=!row.path?'Add a path on the entrance tile to welcome more guests.':!row.nature?'Add trees, water or outdoor amenities within 3 tiles.':row.guests<row.available?'Improve settlement appeal to attract more guests.':!row.level?'Extra beds increase capacity from 2 to 4.':'Comfort improved; raise appeal or add shops nearby.';
 }
 for(const row of shops){row.income=row.customers*row.rate;row.hint=row.customers===0?'Place occupied cabins within 6 tiles. Nearby shops share customers.':row.customers>=row.capacity&&!row.level?'Expand shelves to serve up to 8 guests.':'More occupied cabins within 6 tiles can bring customers; shops share demand.';}
 const guests=cabins.reduce((n,r)=>n+r.guests,0),businessIncome=rows.reduce((n,r)=>n+r.income,0);
 return {appeal,demand,guests,rows,baseline:ECONOMY.baselineIncome,income:ECONOMY.baselineIncome+businessIncome};
}
