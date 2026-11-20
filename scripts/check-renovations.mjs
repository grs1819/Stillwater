const openAppearance=async page=>{if(await page.locator('#appearance-panel').isHidden())await page.locator('#appearance-toggle').click();};
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);controls.enableDamping=false;
const {cabinAt}=await import('./blueprints.js');
const visual=g=>{const a=[];g.traverse(o=>{if(o.isMesh)a.push({vertices:Array.from(o.geometry.attributes.position.array),position:o.position.toArray(),quaternion:o.quaternion.toArray(),color:o.material.color.getHexString()});});return JSON.stringify(a);};
window.probe={data:currentVillageData,save,undo,edit,selectTool,render:()=>renderer.render(scene,camera),select:()=>edit({position:[0,0,0],buildingId:cabins[0].id}),
 functional:()=>{cabins[0].gameplay={workers:['one'],equipment:{stove:2},inventory:{logs:4},progress:.6};save();},
 draft:()=>renovationDraft,visible:()=>cabinView.group.children[0].visible,ghost:()=>visual(cabinGhost.group),actual:(i=0)=>visual(cabinView.group.children[i]),
 gallery:()=>{economy.gold=2000;selectedCabin=null;cancelRenovation(false);const designs=['gable','woodland','craftsman'];cabins=designs.map((design,i)=>renovateCabin(cabinAt(-4+i*4,0),{design,appearance:{exterior:'honey',roof:'moss'}}));rebuild();setDock(false);renderer.render(scene,camera);},
 bounds:()=>{const g=cabinGhost.group.children[0];g.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(g.matrixWorld).invert();const vertices=[];g.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);if(v.x<-.501||v.x>1.501||v.z<-.501||v.z>1.501&&(Math.abs(v.x)>.501||v.z>2.501))vertices.push(v.toArray());}}});return vertices;},
 point:(x=0,z=0)=>{camera.updateMatrixWorld(true);const p=new THREE.Vector3(x,0,z).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};`});});
  await page.goto(process.env.STILLWATER_URL||'http://localhost:5203');await page.waitForFunction(()=>window.probe);
  const p=await page.evaluate(()=>probe.point());if(mobile){await page.touchscreen.tap(p.x,p.y);await page.locator('#cabin-place').tap();}else await page.mouse.click(p.x,p.y);
  await page.evaluate(()=>{probe.functional();probe.select();});const original=await page.evaluate(()=>probe.data().buildings[0]);
  for(const design of ['gable','woodland','craftsman'])for(const exterior of ['honey','birch'])for(const roof of ['moss','slate']){
   await openAppearance(page);await page.locator('#cabin-design').selectOption(design);await openAppearance(page);await page.locator('#cabin-exterior').selectOption(exterior);await openAppearance(page);await page.locator('#cabin-roof').selectOption(roof);
   assert.deepEqual(await page.evaluate(()=>probe.data().buildings[0]),original,'Preview never mutates saved state');
   if(await page.evaluate(()=>!!probe.draft())){assert.equal(await page.evaluate(()=>probe.visible()),false);assert.deepEqual(await page.evaluate(()=>probe.bounds()),[],`${design} decoration clearance`);}
  }
  assert.equal(await page.locator('#cabin-roof').evaluate(e=>{const c=document.createElement('canvas').getContext('2d'),s=getComputedStyle(e);c.font=s.font;return c.measureText(e.selectedOptions[0].textContent).width+parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)+24<=e.clientWidth;}),true,'Full roof name fits');
  await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/stillwater-renovation-${mobile?'mobile':'desktop'}.png`});
  await page.locator('#renovation-cancel').click();assert.equal(await page.evaluate(()=>probe.visible()),true);assert.deepEqual(await page.evaluate(()=>probe.data().buildings[0]),original);
  await openAppearance(page);await page.locator('#cabin-design').selectOption('woodland');const ghost=await page.evaluate(()=>probe.ghost());
  await page.locator('#renovation-confirm').click();assert.equal(await page.evaluate(()=>probe.actual()),ghost,'Confirmed geometry and finishes match preview');
  let b=await page.evaluate(()=>probe.data().buildings[0]);assert.equal(b.design,'woodland');assert.equal(b.id,original.id);assert.deepEqual(b.gameplay,original.gameplay);
  await page.evaluate(()=>probe.undo());assert.deepEqual(await page.evaluate(()=>probe.data().buildings[0]),original);
  await page.evaluate(()=>probe.select());await openAppearance(page);await page.locator('#cabin-design').selectOption('craftsman');await page.evaluate(()=>probe.save());await page.reload();await page.waitForFunction(()=>window.probe);assert.equal(await page.evaluate(()=>probe.data().buildings[0].design),'gable','Unconfirmed draft is never serialized');
  await page.evaluate(()=>probe.select());await openAppearance(page);await page.locator('#cabin-design').selectOption('craftsman');await openAppearance(page);await page.locator('#cabin-roof').selectOption('slate');await page.locator('#renovation-confirm').click();
  await page.reload();await page.waitForFunction(()=>window.probe);b=await page.evaluate(()=>probe.data().buildings[0]);assert.equal(b.design,'craftsman');assert.equal(b.appearance.roof,'slate');assert.equal(b.id,original.id);assert.deepEqual(b.gameplay,original.gameplay);
  await page.evaluate(()=>probe.select());await openAppearance(page);await page.locator('#cabin-design').selectOption('woodland');await page.evaluate(()=>probe.selectTool('tree'));assert.equal(await page.evaluate(()=>probe.draft()),null);assert.equal(await page.evaluate(()=>probe.visible()),true);
  await page.evaluate(()=>probe.gallery());await page.waitForTimeout(300);await page.screenshot({path:`/tmp/stillwater-designs-${mobile?'mobile':'desktop'}.png`});assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const [i,design]of ['gable','woodland','craftsman'].entries()){
   await page.evaluate(()=>{probe.selectTool('house');document.querySelector('button[data-panel=build]').click();});
   await openAppearance(page);await page.locator('#cabin-design').selectOption(design);await openAppearance(page);await page.locator('#cabin-exterior').selectOption('birch');await openAppearance(page);await page.locator('#cabin-roof').selectOption('slate');await page.locator('button[data-panel=build]').click();
   const pos=await page.evaluate(i=>probe.point(-4+i*4,-4),i);
   if(mobile)await page.touchscreen.tap(pos.x,pos.y);else await page.mouse.move(pos.x,pos.y);
   const preview=await page.evaluate(()=>probe.ghost());
   if(mobile)await page.locator('#cabin-place').tap();else await page.mouse.click(pos.x,pos.y);
   assert.equal(await page.evaluate(i=>probe.actual(3+i),i),preview,'Placement ghost matches final design and finishes');assert.equal(await page.evaluate(i=>probe.data().buildings[3+i].design,i),design);
  }
  assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS ${mobile?'mobile':'desktop'} renovations: all 12 combinations, clearance, geometry parity, confirm/cancel/undo, functional identity, drafts not saved, reload, tool cancellation`);
 }
}finally{await browser.close();}
