import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const seed={blocks:{'0,0,0':{type:'house',wood:'cedar',roof:'slate',role:'inn'}},water:{'1,1':'lake'},terrain:{'3,3':1},peak:12};
 await page.addInitScript(seed=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('mosswood-v2',JSON.stringify(seed));sessionStorage.setItem('seeded','1');}},seed);
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nrenderer.setAnimationLoop(null);renderer.render(scene,camera);window.probe={data:()=>({blocks,water,terrain,peak}),villages,edit};'});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5193');await page.waitForFunction(()=>window.probe);
 assert.deepEqual(await page.evaluate(()=>probe.data()),seed);assert.equal(await page.evaluate(()=>localStorage.getItem('mosswood-v2')),JSON.stringify(seed));
 await page.locator('#village-toggle').tap();await page.locator('#village-name').fill('Original town');await page.locator('#village-rename').tap();
 await page.locator('#village-create').tap();assert.equal(await page.evaluate(()=>Object.keys(probe.data().blocks).length),0);
 await page.locator('#village-name').fill('Lake retreat');await page.locator('#village-rename').tap();
 await page.locator('#village-close').tap();await page.evaluate(()=>probe.edit({position:[-2,0,0],normal:[0,1,0],ground:true}));
 await page.locator('#village-toggle').tap();await page.getByRole('button',{name:'Original town',exact:true}).tap();assert.deepEqual(await page.evaluate(()=>probe.data()),seed);
 await page.getByRole('button',{name:'Lake retreat',exact:true}).tap();assert.ok(await page.evaluate(()=>probe.data().blocks['-2,0,0']));
 await page.locator('#village-create').tap();assert.equal(await page.locator('#village-create').isDisabled(),true);
 await page.locator('#village-delete').tap();await page.locator('#village-delete-cancel').tap();assert.equal(await page.evaluate(()=>probe.villages.list().length),3);
 await page.locator('#village-delete').tap();await page.locator('#village-delete-yes').tap();assert.equal(await page.evaluate(()=>probe.villages.list().length),2);
 const downloadPromise=page.waitForEvent('download');await page.locator('#village-export').tap();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'stillwater-village.json');
 await page.locator('#village-file').setInputFiles({name:'copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,name:'Imported copy',data:seed}))});await page.waitForFunction(()=>probe.villages.active.name==='Imported copy');
 await page.reload();await page.waitForFunction(()=>window.probe);assert.deepEqual(await page.evaluate(()=>probe.data()),seed);
 assert.equal(await page.evaluate(()=>localStorage.getItem('mosswood-v2')),JSON.stringify(seed));
 await page.locator('#village-toggle').tap();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'/tmp/stillwater-villages.png'});assert.deepEqual(errors,[]);
 console.log('PASS villages: legacy migration retained, three isolated slots, edits, rename, switching, explicit delete/cancel, export/import, reload and mobile layout.');
}finally{await browser.close();}
