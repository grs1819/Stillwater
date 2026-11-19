import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);controls.enableDamping=false;
window.shopTest=({design,exterior,roof,level,rotation=0})=>{
 const b=buildingAt(SHOP.id,0,0,rotation,{exterior,roof},'12345678-1234-1234-1234-123456789abc');b.design=design;b.gameplay.businessLevel=level;
 cabins=[b];rebuild();cabinGhost.update([b],()=>0);cabinGhost.group.visible=false;
 const actual=cabinView.group.children[0],preview=cabinGhost.group.children[0],bounds=[];actual.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(actual.matrixWorld).invert();let meshes=0;
 actual.traverse(o=>{if(o.isMesh){meshes++;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);if(v.x<-.501||v.x>1.501||v.z<-.501||v.z>1.501&&(Math.abs(v.x)>.501||v.z>2.501))bounds.push(v.toArray());}}});
 const glass=[],ghostGlass=[];actual.traverse(o=>{if(o.name==='shop-glass')glass.push(o);});preview.traverse(o=>{if(o.name==='shop-glass')ghostGlass.push(o);});
 const solidWall=actual.children.some(o=>o.isMesh&&o.geometry.parameters?.height===1.35&&o.geometry.parameters?.depth>1&&o.geometry.parameters?.width>1);
 camera.position.set(4.6,3.3,6.5);controls.target.set(.5,.85,.5);controls.update();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
 return {bounds,meshes,glass:glass.length,transparent:glass.every(o=>o.material.transparent&&o.material.opacity<.3&&!o.material.depthWrite),previewGlass:ghostGlass.every(o=>o.material.opacity===.16),display:!!actual.getObjectByName('shop-display'),expanded:!!actual.getObjectByName('shop-expanded-shelves'),solidWall,geometry:renderer.info.memory.geometries};
};`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5209');await page.waitForFunction(()=>window.shopTest);
 for(const design of ['gable','woodland','craftsman'])for(const exterior of ['honey','birch'])for(const roof of ['moss','slate'])for(const level of [0,1]){
  const r=await page.evaluate(config=>shopTest(config),{design,exterior,roof,level,rotation:level});assert.deepEqual(r.bounds,[],`${design} clearance`);assert.equal(r.glass,3);assert.ok(r.transparent&&r.previewGlass&&r.display);assert.equal(r.expanded,!!level);assert.equal(r.solidWall,false);
 }
 for(const design of ['gable','woodland','craftsman']){await page.evaluate(design=>shopTest({design,exterior:'honey',roof:'slate',level:1}),design);await page.screenshot({path:`/tmp/storefront-${design}.png`});}
 const config={design:'gable',exterior:'honey',roof:'slate',level:0};const before=await page.evaluate(config=>shopTest(config),config);for(let i=0;i<8;i++)await page.evaluate(level=>shopTest({design:'gable',exterior:'honey',roof:'slate',level}),i%2);const after=await page.evaluate(config=>shopTest(config),config);assert.equal(after.geometry,before.geometry,'rebuilding disposes old geometry');
 assert.deepEqual(errors,[]);console.log('PASS storefront: 24 design/finish/upgrade variants, rotated clearance, transparent actual/preview panes, hollow facade, display shelves and stable geometry allocation');
}finally{await browser.close();}
