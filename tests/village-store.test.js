import test from 'node:test';
import assert from 'node:assert/strict';
import {createVillageStore} from '../village-store.js';
function fixture(){const map=new Map();let id=0;return {storage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},uuid:()=>`00000000-0000-4000-8000-${String(++id).padStart(12,'0')}`};}
const village={blocks:{'0,0,0':{type:'house',wood:'cedar',roof:'slate',role:'inn'}},water:{'1,1':'lake'},terrain:{'3,3':1},peak:12};
test('migration preserves a current village and leaves its original recovery key untouched',()=>{
 const f=fixture(),raw=JSON.stringify(village);f.storage.setItem('mosswood-v2',raw);
 const store=createVillageStore(f);assert.equal(store.error,null);assert.deepEqual(store.active.data,village);assert.equal(f.storage.getItem('mosswood-v2'),raw);
 store.save({...village,peak:15});assert.equal(createVillageStore(f).active.data.peak,15);assert.equal(f.storage.getItem('mosswood-v2'),raw);
});
test('three slots persist independent data and selection',()=>{
 const f=fixture(),store=createVillageStore(f),first=store.active.id;
 store.save(village);const second=store.create('River village');assert.equal(Object.keys(second.data.blocks).length,0);
 store.create('Hill village');assert.throws(()=>store.create('Fourth'),/slots/);store.select(first);assert.equal(store.active.data.peak,12);
 store.rename(first,'Forest village');assert.equal(createVillageStore(f).active.name,'Forest village');
});
test('guest, account, beta and live collections do not share data',()=>{
 const f=fixture();createVillageStore(f).save(village);
 const account=createVillageStore({...f,owner:'11111111-1111-4111-8111-111111111111'});assert.equal(account.active,null);
 const beta=createVillageStore({...f,namespace:'stillwater-beta-v2'});assert.equal(beta.active.data.peak,0);
});
test('invalid or newer collections remain untouched rather than being replaced with an empty save',()=>{
 const f=fixture();f.storage.setItem('mosswood-v2-slots-guest','{"version":99}');const store=createVillageStore(f);
 assert.ok(store.error);assert.throws(()=>store.create('New'),/recovery/);assert.equal(f.storage.getItem(store.key),'{"version":99}');
});
test('stale tabs and failed writes cannot replace a saved collection',()=>{
 const f=fixture(),first=createVillageStore(f),second=createVillageStore(f);first.save(village);
 assert.throws(()=>second.save({blocks:{}}),/Another tab/);assert.equal(createVillageStore(f).active.data.peak,12);
 f.storage.setItem=()=>{throw Error('Quota exceeded');};assert.throws(()=>first.rename(first.active.id,'Lost'),/Quota/);assert.equal(first.active.name,'My village');
});
test('cloud acknowledgement keeps newer local edits dirty',()=>{
 const f=fixture(),store=createVillageStore(f),slot=store.active;store.save(village);store.acknowledge(slot.id,slot.revision,1);
 assert.equal(store.active.dirty,true);assert.equal(store.active.cloudRevision,1);
 store.acknowledge(slot.id,store.active.revision,2);assert.equal(store.active.dirty,false);
 assert.throws(()=>{store.save(village);store.acceptRemote({id:slot.id,name:'Remote',data:village,revision:3});},/unsynced/);
});
