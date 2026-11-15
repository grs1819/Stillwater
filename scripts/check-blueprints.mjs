import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('mosswood-v2','production-sentinel');});
  await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nrenderer.setAnimationLoop(null);controls.enableDamping=false;window.probe={data:currentVillageData,edit,undo,selectTool,save,villages,render:()=>renderer.render(scene,camera),point:(x,y,z)=>{camera.updateMatrixWorld(true);const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};},preview:()=>({visible:cabinGhost.group.visible,arrow:entranceArrow.visible,rotation:cabinRotation,pending:!!pendingCabin}),meshes:()=>cabinView.group.children.length};`});});
  await page.goto(process.env.STILLWATER_URL||'http://localhost:5193');await page.waitForFunction(()=>window.probe);
  const click=async(x,y,z)=>{const p=await page.evaluate(([x,y,z])=>probe.point(x,y,z),[x,y,z]);if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);};
  if(mobile){
   await page.evaluate(()=>{probe.selectTool('tree');probe.edit({position:[0,0,0],normal:[0,1,0],ground:true});probe.selectTool('house');});
   await click(0,1,0);assert.equal(await page.locator('#cabin-place').isDisabled(),true);assert.equal(await page.evaluate(()=>probe.data().buildings.length),0);
   await page.locator('#cabin-placement-cancel').tap();await page.evaluate(()=>probe.undo());
  }
  if(!mobile){const p=await page.evaluate(()=>probe.point(0,0,0));await page.mouse.move(p.x,p.y);assert.equal(await page.evaluate(()=>probe.preview().visible),true);assert.equal(await page.evaluate(()=>probe.preview().arrow),true);}
  await click(0,0,0);
  if(mobile){
   assert.equal(await page.evaluate(()=>probe.data().buildings.length),0);assert.equal(await page.evaluate(()=>probe.preview().pending),true);
   await page.locator('#cabin-placement-rotate').tap();assert.equal(await page.evaluate(()=>probe.preview().rotation),1);
   for(let i=0;i<3;i++)await page.locator('#cabin-placement-rotate').tap();
   await page.evaluate(()=>probe.render());await page.screenshot({path:'/tmp/stillwater-cabin-ghost.png'});
   await page.locator('#cabin-placement-cancel').tap();assert.equal(await page.evaluate(()=>probe.preview().visible),false);assert.equal(await page.evaluate(()=>probe.data().buildings.length),0);
   await click(0,0,0);const cancelSession=await page.context().newCDPSession(page);await cancelSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:110,y:330}]});await cancelSession.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await page.evaluate(()=>probe.preview().pending),false);assert.equal(await page.evaluate(()=>probe.data().buildings.length),0);
   await click(0,0,0);await page.locator('#cabin-place').tap();assert.equal(await page.evaluate(()=>probe.preview().visible),false);
  }
  assert.equal(await page.evaluate(()=>probe.data().buildings.length),1);
  const id=await page.evaluate(()=>probe.data().buildings[0].id);
  await click(.5,1,.5);await page.waitForFunction(()=>!document.querySelector('#cabin-new').hidden);
  await page.locator('#cabin-exterior').selectOption('birch');await page.locator('#cabin-roof').selectOption('slate');await page.locator('#renovation-confirm').click();
  await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/stillwater-cabin-panel-${mobile?'mobile':'desktop'}.png`});
  assert.equal(await page.evaluate(()=>probe.data().buildings[0].id),id);
  assert.equal(await page.evaluate(()=>probe.data().buildings[0].appearance.roof),'slate');
  await page.evaluate(()=>probe.undo());assert.equal(await page.evaluate(()=>probe.data().buildings[0].appearance.roof),'moss');
  // Re-select and restore finish, then verify serialized reload and full-object removal.
  await page.evaluate(()=>probe.edit({position:[0,0,0],buildingId:probe.data().buildings[0].id}));await page.locator('#cabin-roof').selectOption('slate');await page.locator('#renovation-confirm').click();
  await page.reload();await page.waitForFunction(()=>window.probe);assert.equal(await page.evaluate(()=>probe.data().buildings[0].id),id);assert.equal(await page.evaluate(()=>probe.data().buildings[0].appearance.roof),'slate');
  await page.evaluate(()=>{probe.selectTool('erase');probe.edit({position:[0,0,0],buildingId:probe.data().buildings[0].id});});assert.equal(await page.evaluate(()=>probe.data().buildings.length),0);
  await page.evaluate(()=>probe.undo());assert.equal(await page.evaluate(()=>probe.data().buildings[0].id),id);
  await page.evaluate(()=>{probe.selectTool('house');document.querySelector('#dock-toggle').click();});
  await page.locator('#cabin-rotate').click();await page.locator('#dock-toggle').click();
  await page.evaluate(()=>probe.edit({position:[-3,0,-3],normal:[0,1,0],ground:true}));assert.equal(await page.evaluate(()=>probe.data().buildings[1].rotation),1);
  await page.evaluate(()=>{probe.selectTool('path');probe.edit({position:[0,0,2],normal:[0,1,0],ground:true});});
  assert.equal(await page.evaluate(()=>probe.data().blocks['0,0,2']?.type),'path');
  await page.evaluate(()=>{probe.selectTool('terrain');probe.edit({position:[0,0,3],normal:[0,1,0],ground:true});});
  assert.equal(await page.evaluate(()=>probe.data().terrain['0,3']),undefined);
  await page.evaluate(()=>{probe.selectTool('water');probe.edit({position:[0,0,1],normal:[0,1,0],ground:true});probe.selectTool('house');});
  assert.equal(await page.evaluate(()=>probe.data().water['0,1']),undefined);
  const count=await page.evaluate(()=>probe.data().buildings.length);await page.evaluate(()=>probe.edit({position:[9,0,9],normal:[0,1,0],ground:true}));assert.equal(await page.evaluate(()=>probe.data().buildings.length),count);
  if(mobile){
   const p=await page.evaluate(()=>probe.point(.5,1,.5)),cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y}]});await page.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.locator('#touch-remove').tap();assert.equal(await page.evaluate(()=>probe.data().buildings.length),count-1);await page.evaluate(()=>probe.undo());
  }
  await page.locator('#village-toggle').click();const downloaded=page.waitForEvent('download');await page.locator('#village-export').click();const file=await downloaded;const fs=await import('node:fs/promises');const data=JSON.parse(await fs.readFile(await file.path(),'utf8'));assert.equal(data.version,2);assert.equal(data.data.buildings[0].id,id);
  await page.locator('#village-file').setInputFiles({name:'copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForFunction(()=>probe.villages.list().length===2);assert.equal(await page.evaluate(()=>probe.data().buildings[0].id),id);
  await page.locator('#village-close').click();await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/stillwater-blueprint-${mobile?'mobile':'desktop'}.png`});
  assert.equal(await page.evaluate(()=>localStorage.getItem('mosswood-v2')),'production-sentinel');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS blueprint ${mobile?'mobile':'desktop'}: tap placement, whole selection, customization, identity, undo, rotation, bounds, removal, reload, export/import, production isolation`);
 }
}finally{await browser.close();}
