// One serialized queue per identity. Stopping it fences every late response.
export function createCloudSync({store,remote,onChange=()=>{},delay=800}){
 let stopped=false,running=null,timer=null,again=false,status='local',message='Saved on this device.';
 const emit=(next,text)=>{if(stopped)return;status=next;message=text;onChange({status,message});};
 async function reconcile(){
  const rows=await remote.list();if(stopped)return;
  const byId=new Map(rows.map(row=>[row.id,row]));
  for(const local of store.list()){
   const row=byId.get(local.id);byId.delete(local.id);
   if(local.conflict){store.setConflict(local.id,row||null);continue;}
   if(local.dirty){
    if((row?.revision||0)!==local.cloudRevision)store.setConflict(local.id,row||null);
   }else if(!row)store.remove(local.id);
   else if(row.revision!==local.cloudRevision)store.acceptRemote(row);
  }
  for(const row of byId.values())store.acceptRemote(row);
  if(stopped)return;
  onChange({status:'syncing',message:'Saving to your account…',reload:true});
  for(const slot of store.list()){
   if(stopped)return;
   if(!slot.dirty||slot.conflict)continue;
   try{
    const row=await remote.save(slot);if(stopped)return;
    store.acknowledge(slot.id,slot.revision,row.revision);
   }catch(error){
    if(stopped)return;
    if(!['40001','PT409'].includes(error.code))throw error;
    const latest=await remote.list();if(stopped)return;
    store.setConflict(slot.id,latest.find(row=>row.id===slot.id)||null);
   }
  }
  if(stopped)return;
  if(store.list().some(slot=>slot.conflict))emit('conflict','Two versions need your choice. Both have been kept.');
  else if(store.list().some(slot=>slot.dirty)){emit('local','New changes saved on this device.');again=true;}
  else emit('synced','All villages saved to your account.');
 }
 async function flush(){
  clearTimeout(timer);if(stopped)return;
  if(running){again=true;return running;}
  emit('syncing','Saving to your account…');
  running=(async()=>{
   do{again=false;try{await reconcile();}catch(error){again=false;emit('offline',`Saved on this device. Could not sync: ${error.message}`);}}while(again&&!stopped);
  })();
  try{await running;}finally{running=null;}
 }
 return {
  get state(){return {status,message};},
  schedule(){if(stopped)return;clearTimeout(timer);emit('local','Saved on this device. Waiting to sync…');timer=setTimeout(flush,delay);},
  flush,
  async remove(id){
   await flush();if(stopped)return false;
   // Hold the same queue lock as refresh/save while deletion is in flight.
   // Focus and reconnect events can request a later pass, never recreate a deleted row.
   const task=(async()=>{
    const slot=store.list().find(s=>s.id===id);if(!slot)return true;
    if(slot.conflict)throw Error('Resolve the two versions before deleting this village.');
    if(slot.cloudRevision){await remote.remove(slot);if(stopped)return false;}
    const current=store.list().find(s=>s.id===id);
    if(current.revision!==slot.revision){store.setConflict(id,null);emit('conflict','This village changed while deleting. Keep the local copy or accept deletion.');return false;}
    store.remove(id);emit('local','Village deleted.');return true;
   })();
   running=task;
   try{return await task;}finally{running=null;if(again&&!stopped){again=false;this.schedule();}}
  },
  stop(){stopped=true;clearTimeout(timer);},
 };
}

export function supabaseRemote(client,environment='beta'){
 const unwrap=({data,error})=>{if(error)throw error;return data;};
 return {
  async list(){return unwrap(await client.from('stillwater_villages').select('*').eq('environment',environment));},
  async save(slot){return unwrap(await client.rpc('stillwater_save_village',{p_environment:environment,p_id:slot.id,p_name:slot.name,p_data:slot.data,p_expected_revision:slot.cloudRevision}));},
  async remove(slot){return unwrap(await client.rpc('stillwater_delete_village',{p_environment:environment,p_id:slot.id,p_expected_revision:slot.cloudRevision}));},
 };
}
