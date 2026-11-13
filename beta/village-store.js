import {normalize} from './town.js';
export const VILLAGE_LIMIT=3;
const clone=value=>structuredClone(value);
export function villageName(value){return String(value||'My village').trim().slice(0,40)||'My village';}
export function validateVillage(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||!value.blocks||typeof value.blocks!=='object'||Array.isArray(value.blocks))throw new Error('This village file is not valid.');
  if(JSON.stringify(value).length>2_000_000)throw new Error('This village file is too large.');
  return normalize(value);
}
// A separate collection per identity/environment keeps guest, account and beta saves apart.
// Existing single-village keys remain untouched as a recovery copy after migration.
export function createVillageStore({storage,namespace='mosswood-v2',owner='guest',uuid=()=>crypto.randomUUID(),now=()=>new Date().toISOString()}={}){
  if(owner!=='guest'&&!/^[\da-f-]{36}$/i.test(owner))throw new Error('Invalid account identity.');
  const key=`${namespace}-slots-${owner}`;
  let collection,raw,lastWritten,error=null;
  function persist(next){
    if(error)throw new Error('Saved villages could not be read. Export a recovery copy before making changes.');
    // Refuse to replace a collection changed by another tab since our last read.
    if(storage.getItem(key)!==lastWritten)throw new Error('Another tab changed these villages. Reload before saving to avoid overwriting it.');
    const encoded=JSON.stringify(next);storage.setItem(key,encoded);lastWritten=encoded;collection=next;
  }
  function freshSlot(name,data=normalize({})){return {id:uuid(),name:villageName(name),data:clone(data),updatedAt:now(),revision:1,cloudRevision:0,dirty:true};}
  try{
    raw=storage.getItem(key);lastWritten=raw;
    if(raw!==null){
      const saved=JSON.parse(raw);
      if(saved.version!==1||!Array.isArray(saved.slots)||saved.slots.length>VILLAGE_LIMIT)throw new Error('Unsupported village collection.');
      const ids=new Set();
      const slots=saved.slots.map(slot=>{
        if(typeof slot.id!=='string'||!/^[\da-f-]{36}$/i.test(slot.id)||ids.has(slot.id)||!Number.isSafeInteger(slot.revision)||slot.revision<1||!Number.isSafeInteger(slot.cloudRevision)||slot.cloudRevision<0)throw new Error('Invalid village slot.');
        ids.add(slot.id);return {...slot,name:villageName(slot.name),data:validateVillage(slot.data),dirty:!!slot.dirty};
      });
      collection={version:1,activeId:ids.has(saved.activeId)?saved.activeId:slots[0]?.id||null,slots};
    }else{
      let initial=null;
      if(owner==='guest'){
        const current=storage.getItem(namespace),legacy=storage.getItem(namespace.replace(/v2$/,'v1'));
        if(current!==null)initial=validateVillage(JSON.parse(current));
        else if(legacy!==null)initial=normalize(JSON.parse(legacy),true);
        else initial=normalize({});
      }
      const slot=initial?freshSlot('My village',initial):null;
      collection={version:1,activeId:slot?.id||null,slots:slot?[slot]:[]};persist(collection);
    }
  }catch(cause){
    error=cause;collection??={version:1,activeId:null,slots:[]};
  }
  function update(id,mutate){
    const next=clone(collection),slot=next.slots.find(s=>s.id===id);
    if(!slot)throw new Error('Village not found.');mutate(slot);persist(next);return clone(slot);
  }
  return {
    key,owner,get error(){return error;},get active(){return clone(collection.slots.find(s=>s.id===collection.activeId)||null);},
    list(){return clone(collection.slots);},
    recovery(){return raw??storage.getItem(namespace)??storage.getItem(namespace.replace(/v2$/,'v1'))??'';},
    create(name,data=normalize({})){
      if(collection.slots.length>=VILLAGE_LIMIT)throw new Error(`All ${VILLAGE_LIMIT} village slots are in use.`);
      const slot=freshSlot(name,validateVillage(data)),next=clone(collection);next.slots.push(slot);next.activeId=slot.id;persist(next);return clone(slot);
    },
    select(id){if(!collection.slots.some(s=>s.id===id))throw new Error('Village not found.');persist({...collection,activeId:id});return this.active;},
    save(data){const id=collection.activeId;if(!id)throw new Error('Create or open a village first.');return update(id,s=>{s.data=validateVillage(data);s.revision++;s.dirty=true;s.updatedAt=now();});},
    rename(id,name){return update(id,s=>{s.name=villageName(name);s.revision++;s.dirty=true;s.updatedAt=now();});},
    remove(id){const next=clone(collection);next.slots=next.slots.filter(s=>s.id!==id);if(next.activeId===id)next.activeId=next.slots[0]?.id||null;persist(next);},
    acknowledge(id,localRevision,cloudRevision){
      return update(id,s=>{s.cloudRevision=cloudRevision;if(s.revision===localRevision)s.dirty=false;});
    },
    acceptRemote(row){
      const next=clone(collection),existing=next.slots.find(s=>s.id===row.id);
      if(existing?.dirty)throw new Error('This device has unsynced changes. Choose which version to keep first.');
      const slot={id:row.id,name:villageName(row.name),data:validateVillage(row.data),updatedAt:row.updated_at,revision:(existing?.revision||0)+1,cloudRevision:row.revision,dirty:false};
      if(!/^[\da-f-]{36}$/i.test(slot.id)||!Number.isSafeInteger(slot.cloudRevision)||slot.cloudRevision<1)throw new Error('Invalid cloud village.');
      if(existing)Object.assign(existing,slot);else{if(next.slots.length>=VILLAGE_LIMIT)throw new Error('All village slots are in use.');next.slots.push(slot);}
      if(!next.activeId)next.activeId=slot.id;persist(next);return clone(slot);
    },
  };
}
