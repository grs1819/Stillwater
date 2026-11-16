// All first-pass balancing lives here. No wall-clock timestamps or offline rewards.
export const ECONOMY=Object.freeze({startingGold:500,cabinCost:200,renovationCost:75,refundRate:.5,intervalMs:10_000,baselineIncome:2,appealPerBonus:15,maxGold:1_000_000_000});
export const initialEconomy=()=>({version:1,gold:ECONOMY.startingGold,activeMs:0});
export function normalizeEconomy(value){
 if(value===undefined)return initialEconomy();
 if(value?.version!==1||!Number.isSafeInteger(value.gold)||value.gold<0||value.gold>ECONOMY.maxGold||!Number.isFinite(value.activeMs)||value.activeMs<0||value.activeMs>=ECONOMY.intervalMs)throw new Error('Invalid economy save. Original village retained.');
 return {version:1,gold:value.gold,activeMs:value.activeMs};
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
 const items=Object.values(world.blocks),cabins=world.buildings,trees=items.filter(b=>b.type==='tree'),paths=items.filter(b=>b.type==='path').length;
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
export const incomePerInterval=appeal=>ECONOMY.baselineIncome+Math.floor(appeal/ECONOMY.appealPerBonus);
export function advanceIncome(economy,elapsedMs,appeal){
 if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw new Error('Invalid active play duration.');
 const total=economy.activeMs+elapsedMs,ticks=Math.floor(total/ECONOMY.intervalMs);
 const next=transactGold(economy,ticks*incomePerInterval(appeal));next.activeMs=total%ECONOMY.intervalMs;
 return {economy:next,earned:next.gold-economy.gold,ticks};
}
// Foreground heartbeat only. Gaps caused by suspended tabs are discarded, not caught up.
export function activeElapsed(previous,now,active){return active?Math.min(2000,Math.max(0,now-previous)):0;}
