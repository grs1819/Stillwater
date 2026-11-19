import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);
window.probe={data:currentVillageData,earn:earnDuringPlay,save,edit,selectTool,report:currentBusiness,namespace:saveNamespace};`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5211');await page.waitForFunction(()=>window.probe);
 assert.equal(await page.evaluate(()=>probe.data().economy.gold),1000);assert.match(await page.locator('#appeal-summary').textContent(),/18\/min/);
 await page.evaluate(()=>probe.earn(5000));assert.equal(await page.evaluate(()=>probe.data().economy.gold),1001);
 await page.reload();await page.waitForFunction(()=>window.probe);await page.evaluate(()=>probe.earn(5000));assert.equal(await page.evaluate(()=>probe.data().economy.gold),1003);
 await page.evaluate(()=>{probe.edit({position:[0,0,0],normal:[0,1,0],ground:true});document.querySelector('#building-mode').value='shop';probe.edit({position:[4,0,0],normal:[0,1,0],ground:true});probe.selectTool('path');probe.edit({position:[0,0,2],normal:[0,1,0],ground:true});});
 assert.equal(await page.evaluate(()=>probe.report().income),4.5);assert.match(await page.locator('#appeal-summary').textContent(),/54\/min/);
 const balance=await page.evaluate(()=>probe.data().economy.gold);await page.evaluate(()=>probe.earn(60000));assert.equal(await page.evaluate(()=>probe.data().economy.gold),balance+54);
 await page.evaluate(()=>{probe.save();const k=probe.namespace+'-slots-guest',collection=JSON.parse(localStorage.getItem(k));collection.slots.find(s=>s.id===collection.activeId).data.economy={version:1,gold:137,activeMs:9000};localStorage.setItem(k,JSON.stringify(collection));});
 await page.reload();await page.waitForFunction(()=>window.probe);assert.deepEqual(await page.evaluate(()=>probe.data().economy),{version:2,gold:137,activeMs:4500,goldFraction:0});await page.evaluate(()=>probe.save());await page.reload();await page.waitForFunction(()=>window.probe);assert.equal(await page.evaluate(()=>probe.data().economy.activeMs),4500);
 await page.evaluate(()=>probe.earn(500));assert.equal(await page.evaluate(()=>probe.data().economy.gold),141);assert.equal(await page.evaluate(()=>probe.data().economy.goldFraction),2);
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${mobile?'mobile':'desktop'} Gold pace: 1000 start, five-second payouts, exact 54/min, fractional reload, preserved legacy balance and interval migration`);
}}finally{await browser.close();}
