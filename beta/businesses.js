import {SHOP,entrance,footprint} from './blueprints.js';
import {ECONOMY,visitorAppeal} from './economy.js';
// Abstract occupancy: deterministic, derived from the village, and never accrued offline.
export const BUSINESS=Object.freeze({baseDemand:2,appealPerGuest:10,shopRadius:6,cabinCapacity:[2,4],shopCapacity:[4,8],cabinUpgrade:150,shopUpgrade:175,goldPerGuest:1,goldPerCustomer:1});
export const upgradeQuote=b=>({cost:b.blueprint===SHOP.id?BUSINESS.shopUpgrade:BUSINESS.cabinUpgrade,name:b.blueprint===SHOP.id?'Expanded shelves':'Cozy extra beds',capacity:(b.blueprint===SHOP.id?BUSINESS.shopCapacity:BUSINESS.cabinCapacity)[1]});
export function upgradeBusiness(b){
 if((b.gameplay.businessLevel||0)!==0)throw new Error('This business is already fully upgraded.');
 return {...b,gameplay:{...b.gameplay,businessLevel:1}};
}
const center=b=>{const cells=footprint(b);return [cells.reduce((n,c)=>n+c[0],0)/4,cells.reduce((n,c)=>n+c[1],0)/4];};
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
export function businessSummary(world){
 const appeal=visitorAppeal(world),demand=BUSINESS.baseDemand+Math.floor(appeal.score/BUSINESS.appealPerGuest);
 const scenery=[...Object.keys(world.water).map(k=>k.split(',').map(Number)),...Object.entries(world.blocks).filter(([,b])=>b.type==='tree'||b.type==='campProp').map(([k])=>{const [x,,z]=k.split(',').map(Number);return [x,z];})];
 const rows=world.buildings.map(b=>{
  const shop=b.blueprint===SHOP.id,level=b.gameplay.businessLevel||0,pos=center(b),door=entrance(b);
  const path=world.blocks[`${door[0]},0,${door[1]}`]?.type==='path',nature=scenery.some(p=>distance(p,pos)<=9),capacity=(shop?BUSINESS.shopCapacity:BUSINESS.cabinCapacity)[level];
  return {id:b.id,shop,pos,capacity,level,path,nature,quality:Number(path)+Number(nature)+level,available:Math.min(capacity,1+Number(path)+Number(nature)+level),guests:0,customers:0,lodgings:0,income:0,hint:''};
 });
 const cabins=rows.filter(r=>!r.shop).sort((a,b)=>b.quality-a.quality||a.id.localeCompare(b.id)),shops=rows.filter(r=>r.shop);
 let remaining=demand;
 // Distribute one guest per cabin per round; attractive lodgings win ties.
 for(let round=0;remaining&&round<BUSINESS.cabinCapacity[1];round++)for(const row of cabins)if(remaining&&row.guests<row.available){row.guests++;remaining--;}
 for(const row of cabins){
  let unserved=row.guests;
  const nearby=shops.filter(s=>distance(s.pos,row.pos)<=BUSINESS.shopRadius**2).sort((a,b)=>distance(a.pos,row.pos)-distance(b.pos,row.pos)||a.id.localeCompare(b.id));
  for(const shop of nearby){const count=Math.min(unserved,shop.capacity-shop.customers);if(count){shop.customers+=count;shop.lodgings++;unserved-=count;}}
  row.income=row.guests*BUSINESS.goldPerGuest;
  row.hint=!row.path?'Add a path on the entrance tile to welcome more guests.':!row.nature?'Add trees, water or outdoor amenities within 3 tiles.':row.guests<row.available?'Improve settlement appeal to attract more guests.':!row.level?'Extra beds increase capacity from 2 to 4.':'Comfort improved; raise appeal or add shops nearby.';
 }
 for(const row of shops){row.income=row.customers*BUSINESS.goldPerCustomer;row.hint=row.customers===0?'Place occupied cabins within 6 tiles. Nearby shops share customers.':row.customers>=row.capacity&&!row.level?'Expand shelves to serve up to 8 guests.':'More occupied cabins within 6 tiles can bring customers; shops share demand.';}
 const guests=cabins.reduce((n,r)=>n+r.guests,0),businessIncome=rows.reduce((n,r)=>n+r.income,0);
 return {appeal,demand,guests,rows,baseline:ECONOMY.baselineIncome,income:ECONOMY.baselineIncome+businessIncome};
}
