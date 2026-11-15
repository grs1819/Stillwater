import test from 'node:test';
import assert from 'node:assert/strict';
import {createVillageStore} from '../village-store.js';
import {createCloudSync} from '../cloud-sync.js';
const owner='11111111-1111-4111-8111-111111111111';
const data=peak=>({blocks:{},water:{},terrain:{},peak});
function fixture(){
 const map=new Map();let id=0;
 const options={owner,storage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},uuid:()=>`00000000-0000-4000-8000-${String(++id).padStart(12,'0')}`};
 const store=createVillageStore(options),rows=new Map();
 const remote={
  async list(){return structuredClone([...rows.values()]);},
  async save(slot){const old=rows.get(slot.id);if((old?.revision||0)!==slot.cloudRevision)throw Object.assign(Error('save_conflict'),{code:'40001'});const row={id:slot.id,name:slot.name,data:slot.data,revision:(old?.revision||0)+1,updated_at:'2026-11-13T00:00:00Z'};rows.set(slot.id,row);return structuredClone(row);},
  async remove(slot){if(rows.get(slot.id)?.revision!==slot.cloudRevision)throw Object.assign(Error('save_conflict'),{code:'40001'});rows.delete(slot.id);},
 };
 const sync=createCloudSync({store,remote});return {store,remote,rows,sync,options};
}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
test('empty account does not upload guest data; dirty slots save then clean caches refresh',async()=>{
 const f=fixture();await f.sync.flush();assert.equal(f.rows.size,0);
 const slot=f.store.create('One',data(2));await f.sync.flush();assert.equal(f.store.active.dirty,false);assert.equal(f.rows.get(slot.id).revision,1);
 f.rows.get(slot.id).data=data(3);f.rows.get(slot.id).revision=2;await f.sync.flush();assert.equal(f.store.active.data.peak,3);
 f.rows.delete(slot.id);await f.sync.flush();assert.equal(f.store.active,null);
});
test('offline errors retain edits across a fresh store and reconnect uploads them',async()=>{
 const f=fixture();f.store.create('One',data(4));const list=f.remote.list;f.remote.list=async()=>{throw Error('Offline');};await f.sync.flush();
 assert.equal(f.sync.state.status,'offline');assert.equal(createVillageStore(f.options).active.data.peak,4);
 f.remote.list=list;await f.sync.flush();assert.equal(f.store.active.dirty,false);assert.equal(f.rows.size,1);
});
test('simultaneous device edits persist both versions until an explicit choice',async()=>{
 const f=fixture();const slot=f.store.create('One',data(1));await f.sync.flush();f.store.save(data(2));f.rows.get(slot.id).data=data(3);f.rows.get(slot.id).revision++;
 await f.sync.flush();assert.equal(f.sync.state.status,'conflict');assert.equal(f.store.active.data.peak,2);assert.equal(f.rows.get(slot.id).data.peak,3);
 const recovered=createVillageStore(f.options);assert.equal(recovered.active.remoteConflict.data.peak,3);
 f.store.resolveLocal(slot.id);await f.sync.flush();assert.equal(f.rows.get(slot.id).data.peak,2);assert.equal(f.rows.get(slot.id).revision,3);
 f.store.save(data(5));f.rows.delete(slot.id);await f.sync.flush();assert.equal(f.store.active.conflict,true);f.store.resolveRemote(slot.id);assert.equal(f.store.active,null);
});
test('edits and slot switches during a write are never acknowledged as already saved',async()=>{
 const f=fixture(),first=f.store.create('One',data(1));const gate=deferred(),entered=deferred(),save=f.remote.save;
 let once=true;f.remote.save=async slot=>{if(once){once=false;entered.resolve();await gate.promise;}return save(slot);};
 const run=f.sync.flush();await entered.promise;f.store.save(data(2));const second=f.store.create('Two',data(3));gate.resolve();await run;
 assert.equal(f.rows.get(first.id).data.peak,2);assert.equal(f.rows.get(second.id).data.peak,3);assert.equal(f.store.active.id,second.id);
 assert.equal(f.store.list().some(s=>s.dirty),false);
});
test('stopping a user queue fences late reads and write acknowledgements',async()=>{
 const f=fixture();f.store.create('One',data(1));const gate=deferred(),entered=deferred(),save=f.remote.save;
 f.remote.save=async slot=>{entered.resolve();await gate.promise;return save(slot);};const run=f.sync.flush();await entered.promise;
 f.sync.stop();gate.resolve();await run;assert.equal(f.store.active.cloudRevision,0);assert.equal(f.store.active.dirty,true);
 const g=fixture(),read=deferred();g.remote.list=()=>read.promise;const fetch=g.sync.flush();g.sync.stop();read.resolve([...f.rows.values()]);await fetch;assert.equal(g.store.list().length,0);
});
test('stale RPC responses fetch and persist a conflict without overwriting either copy',async()=>{
 const f=fixture(),slot=f.store.create('One',data(1));await f.sync.flush();f.store.save(data(2));
 f.remote.save=async()=>{f.rows.get(slot.id).data=data(8);f.rows.get(slot.id).revision++;throw Object.assign(Error('save_conflict'),{code:'PT409'});};
 await f.sync.flush();assert.equal(f.store.active.data.peak,2);assert.equal(f.store.active.remoteConflict.data.peak,8);
});
test('failed deletion retains the village; deletion locks out focus refresh; edits during deletion survive',async()=>{
 const f=fixture(),slot=f.store.create('One',data(1));await f.sync.flush();const remove=f.remote.remove;
 f.remote.remove=async()=>{throw Error('Offline');};await assert.rejects(f.sync.remove(slot.id),/Offline/);assert.equal(f.store.active.id,slot.id);
 const entered=deferred(),gate=deferred();f.remote.remove=async slot=>{entered.resolve();await gate.promise;return remove(slot);};
 const deletion=f.sync.remove(slot.id);await entered.promise;const refresh=f.sync.flush();f.store.save(data(7));gate.resolve();
 assert.equal(await deletion,false);await refresh;f.sync.stop();assert.equal(f.store.active.data.peak,7);assert.equal(f.store.active.conflict,true);assert.equal(f.rows.size,0);
});
test('choosing cloud data and copying the local conflict preserve independent villages',async()=>{
 const f=fixture(),slot=f.store.create('One',data(1));await f.sync.flush();f.store.save(data(2));f.rows.get(slot.id).data=data(3);f.rows.get(slot.id).revision++;
 await f.sync.flush();const copy=f.store.create('Local copy',f.store.active.data);f.store.resolveRemote(slot.id);await f.sync.flush();
 assert.equal(f.rows.get(slot.id).data.peak,3);assert.equal(f.rows.get(copy.id).data.peak,2);assert.equal(f.store.active.id,copy.id);
});
