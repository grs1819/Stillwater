import {freeformLodges} from './freeform.js';
import {SHOP,CAFE,SAUNA,GUEST_WING,entrance,footprint} from './blueprints.js?v=cabin-lighting-1';
import {ECONOMY,visitorAppeal,advanceIncome} from './economy.js';
import {skillLevel,hospitalityXP} from './skills.js?v=cabin-lighting-1';
// Abstract occupancy is deterministic and derived from the saved village for both active and offline payouts.
export const BUSINESS=Object.freeze({baseDemand:2,appealPerGuest:10,shopRadius:6,cabinCapacity:[2,4,6,6],shopCapacity:[4,8,10,12],cabinUpgrade:150,shopUpgrade:175,goldPerGuest:.75,goldPerCustomer:.75});
// Each tier is a purchase, not an architectural renovation. Existing tier 1 benefits remain intact.
export const BUSINESS_TIERS=Object.freeze({
 sauna:[
  {name:'Woodland Sauna',capacity:2,rate:.5},
  {name:'Cedar Benches',cost:125,hospitality:1,capacity:3,rate:.75,visual:'Tiered cedar seating and neatly stacked towels.'},
  {name:'Stone Heater',cost:200,hospitality:2,capacity:4,rate:.75,visual:'A stone-filled stove, chimney and stacked firewood.'},
  {name:'Panoramic Glazing',cost:300,hospitality:3,capacity:5,rate:1,visual:'Full-height front glazing with slim dark mullions.'},
  {name:'Cooling Porch',cost:425,hospitality:5,capacity:6,rate:1.25,visual:'Glass porch rails, a relaxation bench and warm canopy lights.'},
  {name:'Forest Spa',cost:600,hospitality:7,capacity:8,rate:1.5,visual:'A private cold-plunge tub, timber privacy screen and refined stone base.'},
 ],
 lodge:[
  {name:'Guest Lodge',capacity:2,rate:.75},
  {name:'Comfortable Lodge',cost:150,hospitality:1,capacity:4,rate:.75,visual:'Framed windows, flower boxes and a sheltered entrance.'},
  {name:'Established Lodge',cost:250,hospitality:3,capacity:6,rate:1,visual:'Exposed timber framing and a guest-loft dormer on suitable roofs.'},
  {name:'Premium Retreat',cost:450,hospitality:5,capacity:6,rate:1.5,visual:'Stone plinths, refined trim and a furnished entrance.'},
 ],
 cafe:[
  {name:'Woodland Café',capacity:2,rate:.5},
  {name:'Cozy Tables',cost:125,hospitality:2,capacity:4,rate:.75,visual:'Extra tables, warm pastries and a flower-lined counter.'},
  {name:'Forest Tearoom',cost:225,hospitality:3,capacity:6,rate:1,visual:'Raised roof windows and a deeper sheltered serving canopy.'},
  {name:'Retreat Café',cost:400,hospitality:5,capacity:8,rate:1.25,visual:'A timber portico, stone piers and an abundant pastry display.'},
 ],
 cabin:[
  {name:'Guest Cabin',capacity:2,rate:.75},
  {name:'Comfort',cost:150,hospitality:1,capacity:4,rate:.75,visual:'Sheltered entrance, lanterns, flower boxes and a porch bench.'},
  {name:'Capacity',cost:250,hospitality:3,capacity:6,rate:1,visual:'Raised roof and twin dormers create a spacious guest loft.'},
  {name:'Premium Retreat',cost:450,hospitality:5,capacity:6,rate:1.5,visual:'Glazed timber gable, recessed balcony, stone base and chimney.'},
 ],
 shop:[
  {name:'Supply Shop',capacity:4,rate:.75},
  {name:'Better Displays',cost:175,hospitality:1,capacity:8,rate:.75,visual:'Stocked corner windows, a full canopy and outdoor display shelf.'},
  {name:'Expanded Stock',cost:275,hospitality:3,capacity:10,rate:1,visual:'Raised roof windows, deeper timber canopy and camping displays.'},
  {name:'Woodland Outfitters',cost:500,hospitality:5,capacity:12,rate:1.5,visual:'Grand timber portico, stepped gable, stone piers and outfitter sign.'},
 ],
});
const businessKind=b=>b.blueprint==='freeform-lodge'?'lodge':b.blueprint===SAUNA.id?'sauna':b.blueprint===CAFE.id?'cafe':b.blueprint===SHOP.id?'shop':'cabin';
const extraBeds=b=>(b.gameplay.guestWing?GUEST_WING.beds:0)+(b.gameplay.loft&&(b.gameplay.businessLevel||0)<2?2:0)+(b.gameplay.secondStory?2:0);
export const businessTier=b=>{const tier=BUSINESS_TIERS[businessKind(b)][b.gameplay.businessLevel||0];return {...tier,capacity:tier.capacity+extraBeds(b),rate:(b.gameplay.premiumSuite?Math.max(tier.rate,1.5):tier.rate)+(b.gameplay.luxury?.25:0)};};
export const upgradeQuote=b=>{const level=b.gameplay.businessLevel||0,tier=BUSINESS_TIERS[businessKind(b)][level+1];if(!tier)return null;
 const credit=b.blueprint==='timber-guest-cabin'?(level===0&&b.gameplay.frontPorch?150:level===1&&b.gameplay.loft?250:level===2&&b.gameplay.premiumSuite?450:level===2&&b.gameplay.fireplace?200:0):0;
 return {...tier,cost:Math.max(0,tier.cost-credit),rate:(b.gameplay.premiumSuite?Math.max(tier.rate,1.5):tier.rate)+(b.gameplay.luxury?.25:0),capacity:tier.capacity+extraBeds({...b,gameplay:{...b.gameplay,businessLevel:level+1}})};
};
export function upgradeError(b,skills){
 const quote=upgradeQuote(b);if(!quote)return 'This business is fully upgraded.';
 if(skillLevel(skills?.xp?.hospitality||0)<quote.hospitality)return `Requires Hospitality level ${quote.hospitality}.`;
 return null;
}
export function upgradeBusiness(b,skills){
 const error=upgradeError(b,skills);if(error)throw new Error(error);
 return {...b,gameplay:{...b.gameplay,businessLevel:(b.gameplay.businessLevel||0)+1}};
}
const center=b=>{const cells=footprint(b);return [cells.reduce((n,c)=>n+c[0],0)/cells.length,cells.reduce((n,c)=>n+c[1],0)/cells.length];};
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
export function businessSummary(world){
 const appeal=visitorAppeal(world),demand=BUSINESS.baseDemand+Math.floor(appeal.score/BUSINESS.appealPerGuest);
 const scenery=[...Object.keys(world.water).map(k=>k.split(',').map(Number)),...Object.entries(world.blocks).filter(([,b])=>b.type==='tree'||b.type==='campProp').map(([k])=>{const [x,,z]=k.split(',').map(Number);return [x,z];})];
 const rows=[...world.buildings,...freeformLodges(world.blocks,world.water)].map(b=>{
  const kind=businessKind(b),shop=kind==='shop'||kind==='cafe'||kind==='sauna',level=b.gameplay.businessLevel||0,pos=kind==='lodge'?b.position:center(b),door=kind==='lodge'?b.door:entrance(b);
  const path=!!door&&world.blocks[`${door[0]},0,${door[1]}`]?.type==='path',nature=scenery.some(p=>distance(p,pos)<=9),capacity=businessTier(b).capacity,rate=businessTier(b).rate;
  return {id:b.id,kind,shop,pos,capacity,rate,level,path,nature,quality:Number(path)+Number(nature)+(Math.max(level,b.gameplay.frontPorch?1:0)+(kind==='cabin'&&(b.gameplay.fireplace||b.gameplay.premiumSuite||level>=3)?1:0)+(b.gameplay.premiumLighting?1:0)),available:kind==='lodge'&&!b.operating?0:Math.min(capacity,1+Number(path)+Number(nature)+(Math.max(level,b.gameplay.frontPorch?1:0)+(kind==='cabin'&&(b.gameplay.fireplace||b.gameplay.premiumSuite||level>=3)?1:0)+(b.gameplay.premiumLighting?1:0))+extraBeds(b)),guests:0,customers:0,lodgings:0,income:0,hint:''};
 });
 const cabins=rows.filter(r=>!r.shop).sort((a,b)=>b.quality-a.quality||a.id.localeCompare(b.id)),shops=rows.filter(r=>r.shop);
 let remaining=demand;
 // Distribute one guest per cabin per round; attractive lodgings win ties.
 for(let round=0;remaining&&round<Math.max(0,...cabins.map(r=>r.available));round++)for(const row of cabins)if(remaining&&row.guests<row.available){row.guests++;remaining--;}
 for(const row of cabins){
  for(const kind of ['shop','cafe','sauna']){
  let unserved=row.guests;
  const nearby=shops.filter(s=>s.kind===kind&&distance(s.pos,row.pos)<=BUSINESS.shopRadius**2).sort((a,b)=>distance(a.pos,row.pos)-distance(b.pos,row.pos)||a.id.localeCompare(b.id));
  for(const shop of nearby){const count=Math.min(unserved,shop.capacity-shop.customers);if(count){shop.customers+=count;shop.lodgings++;unserved-=count;}}
  }
  row.income=row.guests*row.rate;
  row.hint=row.kind==='lodge'&&!row.available?'Restore four ground-floor rooms and an accessible entrance to reopen.':!row.path?'Add a path on the entrance tile to welcome more guests.':!row.nature?'Add trees, water or outdoor amenities within 3 tiles.':row.guests<row.available?'Improve settlement appeal to attract more guests.':!row.level?'Upgrade for more beds and improved comfort.':'Comfort improved; raise appeal or add shops nearby.';
 }
 for(const row of shops){row.income=row.customers*row.rate;row.hint=row.customers===0?'Place occupied cabins within 6 tiles. Businesses of the same type share customers.':row.customers>=row.capacity&&row.level<(row.kind==='sauna'?5:3)?'Upgrade to serve more guests and improve earnings.':'Each guest can visit one shop, one café and one sauna. More occupied cabins can bring customers.';}
 const guests=cabins.reduce((n,r)=>n+r.guests,0),businessIncome=rows.reduce((n,r)=>n+r.income,0);
 return {appeal,demand,guests,rows,baseline:ECONOMY.baselineIncome,income:ECONOMY.baselineIncome+businessIncome};
}

// One constant-time payout for all elapsed wall time, without an offline duration cap.
// Persist the returned Gold, XP and timestamp together before exposing any rewards.
export function settleIncome(economy,skills,report,now){
 if(!Number.isSafeInteger(now)||now<0||now>8_640_000_000_000_000)throw new Error('Invalid income time.');
 const previous=economy.lastIncomeAt;
 if(previous===undefined)return {economy:{...economy,lastIncomeAt:now},skills,elapsed:0,earned:0,ticks:0};
 // Moving the system clock backwards never moves the saved checkpoint backwards.
 if(now<=previous)return {economy,skills,elapsed:0,earned:0,ticks:0};
 const elapsed=now-previous,result=advanceIncome(economy,elapsed,report.income);
 return {...result,economy:{...result.economy,lastIncomeAt:now},skills:hospitalityXP(skills,report,result.ticks),elapsed};
}
