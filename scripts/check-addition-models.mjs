import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
let maxMeshes=0;
try{
 const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Date.now=()=>1_800_000_000_000;});
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);controls.enableDamping=false;
const visual=g=>{const a=[];g.traverse(o=>{if(o.isMesh)a.push([Array.from(o.geometry.attributes.position.array),o.position.toArray(),o.quaternion.toArray(),o.material.color.getHexString()]);});return JSON.stringify(a);};
window.tierTest=({shop=false,design='gable',exterior='honey',roof='moss',level=0,rotation=0,render=false})=>{
 const b=buildingAt(shop==='cafe'?CAFE.id:shop?SHOP.id:'timber-guest-cabin',0,0,rotation,{exterior,roof},'12345678-1234-1234-1234-123456789abc');b.design=design;b.gameplay.businessLevel=level;b.gameplay.guestWing=true;b.gameplay.frontPorch=true;b.gameplay.loft=true;
 cabins=[b];rebuild();cabinGhost.update([b],()=>0);cabinGhost.group.visible=false;
 const actual=cabinView.group.children[0],preview=cabinGhost.group.children[0],bounds=[];actual.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(actual.matrixWorld).invert();let meshes=0;
 actual.traverse(o=>{if(o.isMesh){meshes++;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);if(v.x<-.501||v.x>1.501||v.z<-1.501||v.z>2.501)bounds.push(v.toArray());}}});
 if(render){camera.position.set(4.2,3.2,6.6);controls.target.set(.5,1.30,.5);controls.update();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);}
 return {bounds:bounds.slice(0,8),meshes,match:visual(actual)===visual(preview),features:actual.children.filter(g=>g.isGroup).map(g=>g.name),geometry:renderer.info.memory.geometries,signature:visual(actual).length};
};
window.tierUI={data:currentVillageData,save,undo,select:()=>edit({position:[0,0,0],buildingId:cabins[0].id}),grant:(xp,gold)=>{skillProgress={...skillProgress,xp:{...skillProgress.xp,hospitality:xp}};economy={...economy,gold};updateUI();},fixture:()=>{cabins=[buildingAt('timber-guest-cabin',0,0)];skillProgress=emptyWorld().skills;economy={...economy,gold:2000};rebuild();updateUI();save();}};
`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5216');await page.waitForFunction(()=>window.tierTest);
 for(const design of ['gable','woodland','craftsman'])for(const exterior of ['honey','birch','cedar'])for(const roof of ['moss','slate'])for(const level of [0,1,2,3])for(const rotation of [0,1,2,3]){const r=await page.evaluate(c=>tierTest(c),{design,exterior,roof,level,rotation});assert.deepEqual(r.bounds,[],`${design} ${level} ${rotation} clearance`);assert.ok(r.match,'wing preview matches final');assert.ok(r.features.includes('cabin-guest-wing'));maxMeshes=Math.max(maxMeshes,r.meshes);}
 for(const design of ['gable','woodland','craftsman']){await page.evaluate(design=>tierTest({design,roof:'slate',render:true}),design);await page.screenshot({path:'/tmp/cabin-additions-'+design+'.png'});}
 assert.deepEqual(errors,[]);console.log('PASS 288 combined addition design/finish/tier/rotation variants: clearance and ghost parity. Maximum meshes:',maxMeshes);
}finally{await browser.close();}
