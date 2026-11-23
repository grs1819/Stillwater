import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
let maxMeshes=0;
try{
 const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);controls.enableDamping=false;
const visual=g=>{const a=[];g.traverse(o=>{if(o.isMesh)a.push([Array.from(o.geometry.attributes.position.array),o.position.toArray(),o.quaternion.toArray(),o.material.color.getHexString()]);});return JSON.stringify(a);};
window.tierTest=({shop=false,design='gable',exterior='honey',roof='moss',level=0,rotation=0,render=false})=>{
 const b=buildingAt(shop==='cafe'?CAFE.id:shop?SHOP.id:'timber-guest-cabin',0,0,rotation,{exterior,roof},'12345678-1234-1234-1234-123456789abc');b.design=design;b.gameplay.businessLevel=level;
 cabins=[b];rebuild();cabinGhost.update([b],()=>0);cabinGhost.group.visible=false;
 const actual=cabinView.group.children[0],preview=cabinGhost.group.children[0],bounds=[];actual.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(actual.matrixWorld).invert();let meshes=0;
 actual.traverse(o=>{if(o.isMesh){meshes++;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);if(v.x<-.501||v.x>1.501||v.z<-.501||v.z>1.501&&(Math.abs(v.x)>.501||v.z>2.501))bounds.push(v.toArray());}}});
 if(render){camera.position.set(4.2,3.2,6.6);controls.target.set(.5,1.30,.5);controls.update();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);}
 return {bounds:bounds.slice(0,8),meshes,match:visual(actual)===visual(preview),features:actual.children.filter(g=>g.isGroup).map(g=>g.name),geometry:renderer.info.memory.geometries,signature:visual(actual).length};
};
window.tierUI={data:currentVillageData,save,undo,select:()=>edit({position:[0,0,0],buildingId:cabins[0].id}),grant:(xp,gold)=>{skillProgress={...skillProgress,xp:{...skillProgress.xp,hospitality:xp}};economy={...economy,gold};updateUI();},fixture:()=>{cabins=[buildingAt('timber-guest-cabin',0,0)];skillProgress=emptyWorld().skills;economy={...economy,gold:2000};rebuild();updateUI();save();}};
`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5216');await page.waitForFunction(()=>window.tierTest);
 for(const shop of [false,true,'cafe'])for(const design of ['gable','woodland','craftsman'])for(const exterior of ['honey','birch','cedar'])for(const roof of ['moss','slate'])for(const level of [0,1,2,3]){
  const r=await page.evaluate(c=>tierTest(c),{shop,design,exterior,roof,level,rotation:level});maxMeshes=Math.max(maxMeshes,r.meshes);assert.deepEqual(r.bounds,[],`${shop==='cafe'?'cafe':shop?'shop':'cabin'} ${design} tier ${level} clearance`);assert.ok(r.match,'preview/final parity');
  if(level)assert.ok(r.features.includes(shop?'shop-outdoor-displays':'cabin-comfort-porch'));
  if(level>=2)assert.ok(r.features.includes(shop?'shop-raised-roof-windows':'cabin-twin-dormers'));
  if(level===3)assert.ok(r.features.includes(shop?'shop-outfitter-portico':'cabin-premium-balcony'));
 }
 for(const shop of [false,true,'cafe'])for(const level of [0,1,2,3]){await page.evaluate(c=>tierTest(c),{shop,level,roof:shop?'slate':'moss',render:true});await page.screenshot({path:`/tmp/upgrade-${shop==='cafe'?'cafe':shop?'shop':'cabin'}-${level}.png`});}
 const before=await page.evaluate(()=>tierTest({level:0}));for(let i=0;i<8;i++)await page.evaluate(level=>tierTest({level}),i%4);const after=await page.evaluate(()=>tierTest({level:0}));assert.equal(after.geometry,before.geometry);
 for(const mobile of [false,true]){
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1280,height:850});await page.evaluate(()=>{tierUI.fixture();tierUI.select();});
  if(await page.locator('#business-panel').isHidden())await page.locator('#business-toggle').click();await page.locator('#business-upgrade').click();assert.equal(await page.evaluate(()=>tierUI.data().buildings[0].gameplay.businessLevel),1);
  assert.match(await page.locator('#business-upgrade-note').textContent(),/Hospitality level 3/);assert.equal(await page.locator('#business-upgrade').isDisabled(),true);
  await page.evaluate(()=>tierUI.grant(133,249));assert.equal(await page.locator('#business-upgrade').isDisabled(),true);
  await page.evaluate(()=>tierUI.grant(133,1000));
  const beforeFailure=await page.evaluate(()=>tierUI.data());await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};document.querySelector('#business-upgrade').onclick();Storage.prototype.setItem=original;});assert.deepEqual(await page.evaluate(()=>tierUI.data()),beforeFailure,'failed upgrade preserves world, Gold, XP');
  await page.locator('#business-upgrade').click();assert.equal(await page.evaluate(()=>tierUI.data().economy.gold),750);assert.equal(await page.evaluate(()=>tierUI.data().buildings[0].gameplay.businessLevel),2);
  const id=await page.evaluate(()=>tierUI.data().buildings[0].id);const xp=await page.evaluate(()=>tierUI.data().skills.xp.construction);
  await page.evaluate(()=>tierUI.undo());assert.equal(await page.evaluate(()=>tierUI.data().buildings[0].gameplay.businessLevel),1);await page.evaluate(()=>tierUI.select());if(await page.locator('#business-panel').isHidden())await page.locator('#business-toggle').click();await page.locator('#business-upgrade').click();assert.equal(await page.evaluate(()=>tierUI.data().skills.xp.construction),xp);
  await page.evaluate(()=>tierUI.grant(400,700));await page.locator('#business-upgrade').click();assert.equal(await page.evaluate(()=>tierUI.data().buildings[0].gameplay.businessLevel),3);assert.equal(await page.evaluate(()=>tierUI.data().buildings[0].id),id);assert.equal(await page.locator('#business-upgrade').isDisabled(),true);
  await page.evaluate(()=>tierUI.save());const saved=await page.evaluate(()=>tierUI.data());await page.reload();await page.waitForFunction(()=>window.tierUI);assert.deepEqual(await page.evaluate(()=>tierUI.data()),saved);await page.evaluate(()=>tierUI.select());await page.locator('#appearance-toggle').click();await page.locator('#cabin-design').selectOption('woodland');await page.locator('#renovation-confirm').click();assert.equal(await page.evaluate(()=>tierUI.data().buildings[0].gameplay.businessLevel),3);assert.equal(await page.evaluate(()=>tierUI.data().buildings[0].id),id);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 assert.deepEqual(errors,[]);console.log('Max meshes per upgraded building:',maxMeshes);console.log('PASS 216 building/design/finish/tier variants: rotated clearance, ghost parity, all visible tiers, stable geometry; desktop/mobile gates, prices, undo XP protection, identity, renovations, save/reload.');
}finally{await browser.close();}
