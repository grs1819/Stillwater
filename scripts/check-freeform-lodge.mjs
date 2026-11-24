import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},hasTouch:mobile,isMobile:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Date.now=()=>1_800_000_000_000;});
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);controls.enableDamping=false;
window.lodgeTest={data:currentVillageData,undo,report:currentBusiness,commit,save,
 select:()=>inspectBuilding({position:[0,0,0]}),
 fixture:()=>{blocks=Object.fromEntries([0,1].flatMap(x=>[0,1].map(z=>[key(x,0,z),{type:'house',wood:'oak',roof:'slate'}])));cabins=[];water={};terrain={};skillProgress=emptyWorld().skills;economy={...economy,gold:2000};peak=4;history=[];updateUI();rebuild();save();},
 grant:()=>{skillProgress={...skillProgress,xp:{...skillProgress.xp,hospitality:400}};updateUI();},
 view:()=>{setDock(false);camera.position.set(5,3.8,6);controls.target.set(.5,.8,.5);controls.update();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);},
 features:()=>{const out=[];buildings.traverse(o=>{if(o.name)out.push(o.name);});return out;}
};`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5224');await page.waitForFunction(()=>window.lodgeTest);
 await page.evaluate(()=>{lodgeTest.fixture();lodgeTest.select();});
 assert.equal(await page.locator('#lodge-open').isVisible(),true);
 const click=async selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
 await click('#lodge-open');let data=await page.evaluate(()=>lodgeTest.data());const record=Object.values(data.blocks).find(b=>b.lodge).lodge;
 assert.equal(data.economy.gold,1800);assert.equal(data.skills.xp.construction,60);assert.equal(await page.locator('#business-panel').isVisible(),true);assert.equal(await page.locator('#building-role').isDisabled(),true);
 assert.equal((await page.evaluate(()=>lodgeTest.report())).rows.length,1);
 await click('#business-upgrade');data=await page.evaluate(()=>lodgeTest.data());assert.equal(data.economy.gold,1650);assert.equal(Object.values(data.blocks).find(b=>b.lodge).lodge.level,1);
 assert.equal(await page.locator('#business-upgrade').isDisabled(),true);
 const features1=await page.evaluate(()=>lodgeTest.features());assert.ok(features1.includes('lodge-entry-canopy'));assert.ok(features1.includes('lodge-flower-box'));
 await page.evaluate(()=>lodgeTest.undo());assert.equal((await page.evaluate(()=>lodgeTest.data())).economy.gold,1800);
 await page.evaluate(()=>lodgeTest.select());if(await page.locator('#business-panel').isHidden())await click('#business-toggle');await click('#business-upgrade');assert.equal((await page.evaluate(()=>lodgeTest.data())).skills.xp.construction,140);
 await page.evaluate(()=>lodgeTest.grant());
 const beforeFailure=await page.evaluate(()=>lodgeTest.data());await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};document.querySelector('#business-upgrade').onclick();Storage.prototype.setItem=original;});assert.deepEqual(await page.evaluate(()=>lodgeTest.data()),beforeFailure);
 await click('#business-upgrade');assert.ok((await page.evaluate(()=>lodgeTest.features())).includes('lodge-loft-dormer'));
 await click('#business-upgrade');assert.ok((await page.evaluate(()=>lodgeTest.features())).includes('lodge-stone-plinth'));assert.equal(await page.locator('#business-upgrade').isDisabled(),true);
 data=await page.evaluate(()=>lodgeTest.data());assert.equal(data.economy.gold,950);assert.equal(Object.values(data.blocks).find(b=>b.lodge).lodge.id,record.id);
 await page.evaluate(()=>lodgeTest.save());await page.reload();await page.waitForFunction(()=>window.lodgeTest);assert.deepEqual(await page.evaluate(()=>lodgeTest.data()),data);
 // Extend to an L: identity/level survive, and irregular roofs skip the rectangular dormer.
 await page.evaluate(()=>lodgeTest.commit({...lodgeTest.data().blocks,'2,0,0':{type:'house',wood:'oak',roof:'slate'}}));
 assert.equal((await page.evaluate(()=>lodgeTest.report())).rows.length,1);assert.equal(Object.values((await page.evaluate(()=>lodgeTest.data())).blocks).find(b=>b.lodge).lodge.id,record.id);
 assert.equal((await page.evaluate(()=>lodgeTest.features())).includes('lodge-loft-dormer'),false);
 await page.evaluate(()=>lodgeTest.view());await page.screenshot({path:'/tmp/freeform-lodge-L-'+(mobile?'mobile':'desktop')+'.png'});
 await page.evaluate(()=>{lodgeTest.undo();lodgeTest.view();});await page.screenshot({path:'/tmp/freeform-lodge-premium-'+(mobile?'mobile':'desktop')+'.png'});
 await page.evaluate(()=>lodgeTest.select());assert.equal(await page.locator('#business-upgrade').isVisible(),false);await click('#business-toggle');assert.equal(await page.locator('#business-upgrade').isVisible(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS '+(mobile?'mobile':'desktop')+' Guest Lodge: enrollment, upgrades, gates, quota failure, undo XP, reload, extension and L/rectangle visual features.');
}}finally{await browser.close();}
