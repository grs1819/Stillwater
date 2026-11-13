// Browser integration with mocked HTTP, using the shipped official Supabase SDK.
// This checks client behavior, NOT real Supabase RLS or email delivery.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const project='https://dpxkbhuvhansozshyuvo.supabase.co';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const rows=new Map(),errors=[];let offline=false;
const users={a:{id:'11111111-1111-4111-8111-111111111111',email:'a@example.test'},b:{id:'22222222-2222-4222-8222-222222222222',email:'b@example.test'}};
const token=user=>['e30',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.route('**/account-config.js',route=>route.fulfill({contentType:'text/javascript',body:`export const accountConfig={enabled:true,url:'${project}',publishableKey:'sb_publishable_test',environment:'beta'};`}));
 await context.route(`${project}/**`,async route=>{
  if(offline)return route.abort('internetdisconnected');
  const req=route.request(),url=new URL(req.url());let body={};try{body=req.postDataJSON()||{};}catch{}
  const reply=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(url.pathname==='/auth/v1/otp')return reply({});
  if(url.pathname==='/auth/v1/verify'){
   const user=body.email===users.a.email?users.a:users.b;
   return reply({access_token:token(user),refresh_token:'refresh-'+user.id,expires_in:3600,token_type:'bearer',user});
  }
  if(url.pathname==='/auth/v1/logout')return reply({});
  const authorization=req.headers().authorization||'';
  const user=Object.values(users).find(u=>authorization===`Bearer ${token(u)}`)||Object.values(users).find(u=>{try{return JSON.parse(Buffer.from(authorization.split('.')[1],'base64url')).sub===u.id;}catch{return false;}});
  if(!user)return reply({message:'Unauthorized'},401);
  const owned=[...rows.values()].filter(row=>row.owner_id===user.id);
  if(url.pathname==='/rest/v1/stillwater_villages')return reply(owned);
  const old=owned.find(row=>row.id===body.p_id);
  if(url.pathname.endsWith('stillwater_save_village')){
   if((old?.revision||0)!==body.p_expected_revision)return reply({code:'40001',message:'save_conflict'},409);
   const row={id:body.p_id,owner_id:user.id,environment:body.p_environment,name:body.p_name,data:body.p_data,revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};rows.set(row.id,row);return reply(row);
  }
  if(url.pathname.endsWith('stillwater_delete_village')){if(old?.revision!==body.p_expected_revision)return reply({code:'40001',message:'save_conflict'},409);rows.delete(old.id);return reply(null);}
  throw Error('Unexpected request '+url.pathname);
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nrenderer.setAnimationLoop(null);window.probe={get villages(){return villages;},get cloud(){return cloud;},get user(){return accountUser;},edit};'});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5193');await page.waitForFunction(()=>window.probe);
 await page.locator('#village-toggle').tap();await page.locator('#village-name').fill('Guest original');await page.locator('#village-rename').tap();
 async function signIn(user){await page.locator('#account-email').fill(user.email);await page.locator('#account-send').tap();await page.locator('#account-code').fill('123456');await page.locator('#account-verify').tap();await page.waitForFunction(id=>probe.user?.id===id,user.id);await page.waitForFunction(()=>probe.cloud?.state.status==='synced');}
 await signIn(users.a);assert.equal(await page.evaluate(()=>probe.villages.list().length),0);assert.equal(rows.size,0);
 await page.locator('#account-copy-guest').tap();await page.waitForFunction(()=>probe.cloud.state.status==='synced');assert.equal(rows.size,1);
 await page.locator('#village-name').fill('Account A');await page.locator('#village-rename').tap();await page.waitForFunction(()=>probe.cloud.state.status==='synced');
 offline=true;await page.locator('#village-name').fill('Offline A');await page.locator('#village-rename').tap();await page.waitForFunction(()=>probe.cloud.state.status==='offline');assert.equal([...rows.values()][0].name,'Account A');
 offline=false;await page.locator('#account-sync').tap();await page.waitForFunction(()=>probe.cloud.state.status==='synced');assert.equal([...rows.values()][0].name,'Offline A');
 // Simulate another device changing the same row before a dirty upload.
 offline=true;await page.locator('#village-name').fill('Local conflict');await page.locator('#village-rename').tap();await page.waitForFunction(()=>probe.cloud.state.status==='offline');
 const row=[...rows.values()][0];row.name='Remote conflict';row.revision++;
 offline=false;await page.locator('#account-sync').tap();await page.waitForFunction(()=>probe.cloud.state.status==='conflict');await page.locator('#cloud-copy-local').tap();await page.waitForFunction(()=>probe.cloud.state.status==='synced');assert.equal(rows.size,2);assert.ok([...rows.values()].some(row=>row.name==='Local conflict copy'));
 await page.locator('#account-signout').tap();await page.waitForFunction(()=>!probe.user);assert.equal(await page.evaluate(()=>probe.villages.active.name),'Guest original');
 await signIn(users.b);assert.equal(await page.evaluate(()=>probe.villages.list().length),0);await page.locator('#account-signout').tap();await page.waitForFunction(()=>!probe.user);
 await signIn(users.a);assert.equal(await page.evaluate(()=>probe.villages.list().length),2);
 await page.locator('#village-delete').tap();await page.locator('#village-delete-yes').tap();await page.waitForFunction(()=>probe.villages.list().length===1);assert.equal(rows.size,1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/stillwater-accounts.png'});assert.deepEqual(errors,[]);
 console.log('PASS mocked account browser flow: official SDK OTP, guest isolation/copy, offline reconnect, conflict copy, logout, other account, deletion, mobile layout. Real RLS/email checks remain required.');
}finally{await browser.close();}
