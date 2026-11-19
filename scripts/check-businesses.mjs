const openAppearance=async page=>{if(await page.locator('#appearance-panel').isHidden())await page.locator('#appearance-toggle').click();};
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('mosswood-v2','production-sentinel'));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);if(!sessionStorage.getItem('balance-fixture')){economy.gold=500;save();sessionStorage.setItem('balance-fixture','1');}renderer.setAnimationLoop(null);controls.enableDamping=false;
const visual=g=>{const a=[];g.traverse(o=>{if(o.isMesh)a.push({vertices:Array.from(o.geometry.attributes.position.array),position:o.position.toArray(),quaternion:o.quaternion.toArray(),color:o.material.color.getHexString()});});return JSON.stringify(a);};
window.probe={bounds:()=>{const g=cabinGhost.group.children[0];g.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(g.matrixWorld).invert();const vertices=[];g.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);if(v.x<-.501||v.x>1.501||v.z<-.501||v.z>1.501&&(Math.abs(v.x)>.501||v.z>2.501))vertices.push(v.toArray());}}});return vertices;},
data:currentVillageData,report:currentBusiness,earn:earnDuringPlay,save,undo,
 select:i=>edit({position:[...cabins[i].position.slice(0,1),0,cabins[i].position[1]],buildingId:cabins[i].id}),
 remove:i=>edit({position:[0,0,0],buildingId:cabins[i].id},true),
 render:()=>renderer.render(scene,camera),ghost:()=>visual(cabinGhost.group),actual:i=>visual(cabinView.group.children[i]),
 point:(x,z)=>{camera.updateMatrixWorld(true);const p=new THREE.Vector3(x,0,z).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5205');await page.waitForFunction(()=>window.probe);
 const gold=()=>page.evaluate(()=>probe.data().economy.gold);
 const place=async(x,z)=>{const p=await page.evaluate(([x,z])=>probe.point(x,z),[x,z]);if(mobile){await page.touchscreen.tap(p.x,p.y);await page.locator('#cabin-place').tap();}else await page.mouse.click(p.x,p.y);};
 await place(0,0);assert.equal(await gold(),300);
 await page.locator('#dock-toggle').click();await page.locator('#building-mode').selectOption('shop');assert.match(await page.locator('#cabin-price').textContent(),/250 Gold/);await page.locator('#dock-toggle').click();
 const pos=await page.evaluate(()=>probe.point(4,0));if(mobile)await page.touchscreen.tap(pos.x,pos.y);else await page.mouse.move(pos.x,pos.y);
 assert.deepEqual(await page.evaluate(()=>probe.bounds()),[],'shop decoration respects placement clearance');const ghost=await page.evaluate(()=>probe.ghost());assert.equal(await gold(),300,'preview does not charge');
 if(mobile)await page.locator('#cabin-place').tap();else await page.mouse.click(pos.x,pos.y);
 assert.equal(await gold(),50);assert.equal(await page.evaluate(()=>probe.data().buildings[1].blueprint),'supply-shop');assert.equal(await page.evaluate(()=>probe.actual(1)),ghost,'shop preview matches placement');
 let report=await page.evaluate(()=>probe.report());assert.equal(report.guests,1);assert.equal(report.income,3);assert.equal(report.rows[1].customers,1);
 await page.evaluate(()=>probe.select(1));await page.locator('#business-toggle').click();assert.equal(await page.locator('#business-upgrade').isDisabled(),true);assert.match(await page.locator('#business-upgrade-note').textContent(),/Need 175/);
 await page.evaluate(()=>probe.earn(600000));assert.equal(await gold(),410);
 const original=await page.evaluate(()=>probe.data().buildings[1]);if(await page.locator('#business-panel').isHidden())await page.locator('#business-toggle').click();await page.locator('#business-upgrade').click();assert.equal(await gold(),235);assert.equal(await page.evaluate(()=>probe.data().buildings[1].gameplay.businessLevel),1);assert.equal(await page.locator('#business-upgrade').isDisabled(),true);
 await page.evaluate(()=>probe.undo());assert.equal(await gold(),410);assert.deepEqual(await page.evaluate(()=>probe.data().buildings[1]),original);
 await page.evaluate(()=>probe.select(1));if(await page.locator('#business-panel').isHidden())await page.locator('#business-toggle').click();await page.locator('#business-upgrade').click();assert.equal(await gold(),235);
 await openAppearance(page);await page.locator('#cabin-design').selectOption('woodland');await page.locator('#renovation-cancel').click();assert.equal(await gold(),235);
 await openAppearance(page);await page.locator('#cabin-design').selectOption('craftsman');await page.locator('#renovation-confirm').click();assert.equal(await gold(),160);assert.equal(await page.evaluate(()=>probe.data().buildings[1].id),original.id);assert.equal(await page.evaluate(()=>probe.data().buildings[1].gameplay.businessLevel),1);
 await page.evaluate(()=>{probe.earn(605000);probe.save();});const saved=await page.evaluate(()=>probe.data());await page.reload();await page.waitForFunction(()=>window.probe);assert.deepEqual(await page.evaluate(()=>probe.data()),saved,'no offline income or lost upgrades');
 await page.evaluate(()=>probe.earn(5000));assert.equal(await gold(),saved.economy.gold+3,'one remainder payout');
 await page.evaluate(()=>probe.select(0));await page.locator('#business-toggle').click();assert.match(await page.locator('#business-upgrade').textContent(),/150 Gold/);if(await page.locator('#business-panel').isHidden())await page.locator('#business-toggle').click();await page.locator('#business-upgrade').click();assert.equal(await page.evaluate(()=>probe.report().rows[0].capacity),4);
 await page.evaluate(()=>probe.select(1));await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/stillwater-business-${mobile?'mobile':'desktop'}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#dock-toggle').click();await page.waitForTimeout(350);await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/stillwater-shop-${mobile?'mobile':'desktop'}.png`});
 const before=await page.evaluate(()=>probe.data());await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};probe.remove(1);Storage.prototype.setItem=original;});assert.deepEqual(await page.evaluate(()=>probe.data()),before);
 await page.evaluate(()=>probe.remove(0));report=await page.evaluate(()=>probe.report());assert.equal(report.income,1.5);assert.equal(report.rows[0].customers,0);await page.evaluate(()=>probe.undo());assert.equal(await page.evaluate(()=>probe.data().buildings[0].gameplay.businessLevel),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('mosswood-v2')),'production-sentinel');assert.deepEqual(errors,[]);await page.close();
 console.log(`PASS ${mobile?'mobile':'desktop'} businesses: shop placement/ghost, income, upgrade affordability/undo, renovation identity, save/reload, independent upgrades, demand removal, failed save, layout and production isolation`);
}}finally{await browser.close();}
