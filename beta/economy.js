// Shared active/offline rates. Timestamp settlement is handled with village skills in businesses.js.
export const ECONOMY=Object.freeze({startingGold:1000,cabinCost:200,shopCost:250,cafeCost:200,renovationCost:75,refundRate:.5,intervalMs:5_000,baselineIncome:1.5,maxGold:1_000_000_000});
export const initialEconomy=()=>({version:2,gold:ECONOMY.startingGold,activeMs:0,goldFraction:0});
export function normalizeEconomy(value){
 if(value===undefined)return initialEconomy();
 const legacy=value?.version===1,interval=legacy?10_000:ECONOMY.intervalMs;
 if(![1,2].includes(value?.version)||!Number.isSafeInteger(value.gold)||value.gold<0||value.gold>ECONOMY.maxGold||!Number.isFinite(value.activeMs)||value.activeMs<0||value.activeMs>=interval||!legacy&&(!Number.isInteger(value.goldFraction)||value.goldFraction<0||value.goldFraction>3))throw new Error('Invalid economy save. Original village retained.');
 if(value.lastIncomeAt!==undefined&&(!Number.isSafeInteger(value.lastIncomeAt)||value.lastIncomeAt<0||value.lastIncomeAt>8_640_000_000_000_000))throw new Error('Invalid income timestamp.');
 // Preserve progress through the old ten-second interval without issuing a catch-up reward.
 return {version:2,gold:value.gold,activeMs:legacy?value.activeMs/2:value.activeMs,goldFraction:legacy?0:value.goldFraction,...(value.lastIncomeAt===undefined?{}:{lastIncomeAt:value.lastIncomeAt})};
}
export function validatePaidGold(value=0){
 if(!Number.isSafeInteger(value)||value<0||value>ECONOMY.maxGold)throw new Error('Invalid cabin purchase record.');
 return value;
}
export const removalRefund=b=>Math.floor(validatePaidGold(b?.paidGold)*ECONOMY.refundRate);
export const renovationCost=(before,after)=>before.design===after.design?0:ECONOMY.renovationCost;
export function transactGold(economy,delta){
 if(!Number.isSafeInteger(delta))throw new Error('Invalid Gold transaction.');
 if(economy.gold+delta<0)throw new Error(`Not enough Gold — need ${-delta} Gold, have ${economy.gold}.`);
 return {...economy,gold:Math.min(ECONOMY.maxGold,economy.gold+delta)};
}
const tiered=(n,first,rate,second,secondRate)=>Math.min(n,first)*rate+Math.min(Math.max(0,n-first),second)*secondRate;
export function visitorAppeal(world){
 const items=Object.values(world.blocks),cabins=world.buildings.filter(b=>b.blueprint==='timber-guest-cabin'),trees=items.filter(b=>b.type==='tree'),paths=items.filter(b=>b.type==='path').length;
 const species=new Set(trees.map(b=>b.species||'pine')).size,props=new Set(items.filter(b=>b.type==='campProp').map(b=>b.kind||'fire')).size;
 const water=Object.keys(world.water).map(k=>k.split(',').map(Number));
 const waterside=cabins.filter(b=>{const [dx,dz]=[[.5,.5],[.5,-.5],[-.5,-.5],[-.5,.5]][b.rotation];return water.some(([x,z])=>(x-b.position[0]-dx)**2+(z-b.position[1]-dz)**2<=2.5**2);}).length;
 const parts={
  'Guest cabins':tiered(cabins.length,4,5,4,2),
  'Architecture variety':Math.max(0,new Set(cabins.map(b=>b.design)).size-1)*2,
  'Trees & species':tiered(trees.length,6,1,6,.5)+Math.min(3,Math.max(0,species-1)),
  'Paths':tiered(paths,8,.5,8,.25),
  'Outdoor variety':Math.min(4,props)*2+tiered(items.filter(b=>b.type==='camp').length,3,2,3,1),
  'Cabins near water':Math.min(4,waterside)*2,
 };
 return {score:Math.floor(Object.values(parts).reduce((a,b)=>a+b,0)),parts};
}
export function advanceIncome(economy,elapsedMs,income=ECONOMY.baselineIncome){
 if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw new Error('Invalid active play duration.');
 if(!Number.isSafeInteger(income*4)||income<0)throw new Error('Invalid income rate.');
 const total=economy.activeMs+elapsedMs,ticks=Math.floor(total/ECONOMY.intervalMs);
 // Keep quarter-Gold internally, paying whole Gold without losing fractional earnings.
 const quarters=(economy.goldFraction||0)+ticks*Math.round(income*4);
 const next=transactGold(economy,Math.floor(quarters/4));next.activeMs=total%ECONOMY.intervalMs;
 next.goldFraction=next.gold===ECONOMY.maxGold?0:quarters%4;
 return {economy:next,earned:next.gold-economy.gold,ticks};
}
