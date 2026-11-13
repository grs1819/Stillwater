// Run only with two dedicated, empty beta test accounts. Never use a service role.
// Tokens are read from environment variables and are never printed or persisted.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url='https://dpxkbhuvhansozshyuvo.supabase.co';
const key=process.env.STILLWATER_PUBLIC_KEY;
const tokens=[process.env.STILLWATER_TEST_TOKEN_A,process.env.STILLWATER_TEST_TOKEN_B];
if(!key||tokens.some(t=>!t))throw Error('Set STILLWATER_PUBLIC_KEY and STILLWATER_TEST_TOKEN_A/B for two dedicated empty test accounts.');
let keyRole;try{keyRole=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role;}catch{}
if(keyRole==='service_role'||key.startsWith('sb_secret_'))throw Error('Use a public client key only.');
async function request(path,token,body,method=body===undefined?'GET':'POST'){
 const res=await fetch(url+path,{method,headers:{apikey:key,...(token?{Authorization:`Bearer ${token}`} :{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const raw=await res.text();let value;try{value=JSON.parse(raw);}catch{value=raw;}
 return {ok:res.ok,status:res.status,value};
}
const table='/rest/v1/stillwater_villages?environment=eq.beta';
const rpc=name=>'/rest/v1/rpc/stillwater_'+name+'_village';
const fixtures=[];
const save=(token,id,rev=0)=>request(rpc('save'),token,{p_environment:'beta',p_id:id,p_name:'Integration fixture',p_data:{blocks:{},water:{},terrain:{},peak:0},p_expected_revision:rev});
const remove=(token,id,rev)=>request(rpc('delete'),token,{p_environment:'beta',p_id:id,p_expected_revision:rev});
try{
 const users=await Promise.all(tokens.map(t=>request('/auth/v1/user',t)));
 assert.ok(users.every(r=>r.ok),'Both test sessions must be valid');assert.notEqual(users[0].value.id,users[1].value.id,'Use different users');
 for(const token of tokens){const rows=await request(table,token);assert.ok(rows.ok);assert.equal(rows.value.length,0,'Dedicated beta test accounts must start empty');}
 assert.equal((await request(table,null)).ok,false,'Anonymous table reads must be denied');
 assert.equal((await save(null,randomUUID())).ok,false,'Anonymous RPC must be denied');
 const bId=randomUUID();fixtures.push([tokens[1],bId]);assert.ok((await save(tokens[1],bId)).ok);
 const readA=await request(table+'&id=eq.'+bId,tokens[0]);assert.ok(readA.ok);assert.equal(readA.value.length,0,'A must not read B');
 assert.equal((await save(tokens[0],bId,1)).ok,false,'A must not overwrite B');
 assert.equal((await remove(tokens[0],bId,1)).ok,false,'A must not delete B');
 const injected=await request(rpc('save'),tokens[0],{p_environment:'beta',p_id:randomUUID(),p_name:'Injected owner',p_data:{blocks:{}},p_expected_revision:0,p_owner_id:users[1].value.id});
 assert.equal(injected.ok,false,'RPC must reject caller-supplied ownership');
 const direct=await request('/rest/v1/stillwater_villages',tokens[0],{owner_id:users[1].value.id,environment:'beta',id:randomUUID(),name:'Injected owner',data:{blocks:{}}});assert.equal(direct.ok,false,'Direct inserts must be denied');
 const ids=Array.from({length:4},()=>randomUUID());for(const id of ids)fixtures.push([tokens[0],id]);
 const created=await Promise.all(ids.map(id=>save(tokens[0],id)));assert.equal(created.filter(r=>r.ok).length,3,'Concurrent creates must enforce three slots');
 assert.ok(created.some(r=>r.value.code==='23514'));
 const id=ids[created.findIndex(r=>r.ok)];assert.ok((await save(tokens[0],id,1)).ok);
 const stale=await save(tokens[0],id,1);assert.equal(stale.ok,false);assert.equal(stale.value.code,'40001');
 const staleDelete=await remove(tokens[0],id,1);assert.equal(staleDelete.ok,false);assert.equal(staleDelete.value.code,'40001');
 const aRows=await request(table,tokens[0]);assert.equal(aRows.value.find(r=>r.id===id).revision,2);
 const bRows=await request(table,tokens[1]);assert.equal(bRows.value.length,1);assert.equal(bRows.value[0].revision,1);
 console.log('PASS real beta database: anonymous denial, two-user isolation, ownership rejection, concurrent slot limit, stale saves/deletes. Email delivery and browser session recovery need separate checks.');
}finally{
 // Delete only this run's UUIDs, using the current revision; leave unrelated data alone.
 for(const [token,id]of fixtures){const read=await request(table+'&id=eq.'+id,token);if(read.ok&&read.value[0]){const result=await remove(token,id,read.value[0].revision);if(!result.ok)console.error('Fixture cleanup failed for '+id);}}
}
