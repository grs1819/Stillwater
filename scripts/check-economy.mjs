const openAppearance=async page=>{if(await page.locator('#appearance-panel').isHidden())await page.locator('#appearance-toggle').click();};
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
 clearInterval(incomeTimer);renderer.setAnimationLoop(null);
 window.probe={data:currentVillageData,earn:earnDuringPlay,save,undo,history:()=>history.length,
 place:(x,z)=>edit({position:[x,0,z],normal:[0,1,0],ground:true}),
 select:()=>edit({position:[0,0,0],buildingId:cabins[0].id}),remove:()=>edit({position:[0,0,0],buildingId:cabins[0].id},true),
 render:()=>renderer.render(scene,camera)};`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5203');await page.waitForFunction(()=>window.probe);
 const gold=()=>page.evaluate(()=>probe.data().economy.gold);
 assert.equal(await gold(),500);
 await page.evaluate(()=>probe.place(0,0));assert.equal(await gold(),300);
 await page.evaluate(()=>probe.place(0,0));assert.equal(await gold(),300,'overlap costs nothing');
 await page.evaluate(()=>probe.place(4,0));assert.equal(await gold(),100);
 await page.evaluate(()=>probe.place(-4,0));assert.equal(await gold(),100);assert.equal(await page.evaluate(()=>probe.data().buildings.length),2);
 await page.evaluate(()=>probe.select());const id=await page.evaluate(()=>probe.data().buildings[0].id);
 await openAppearance(page);await page.locator('#cabin-design').selectOption('woodland');assert.equal(await gold(),100);await page.locator('#renovation-cancel').click();assert.equal(await gold(),100);
 await openAppearance(page);await page.locator('#cabin-design').selectOption('woodland');await page.locator('#renovation-confirm').click();assert.equal(await gold(),25);assert.equal(await page.evaluate(()=>probe.data().buildings[0].id),id);
 await openAppearance(page);await page.locator('#cabin-design').selectOption('craftsman');assert.equal(await page.locator('#renovation-confirm').isDisabled(),true);await page.locator('#renovation-cancel').click();
 await openAppearance(page);await page.locator('#cabin-roof').selectOption('slate');await page.locator('#renovation-confirm').click();assert.equal(await gold(),25);
 await page.evaluate(()=>probe.remove());assert.equal(await gold(),125);await page.evaluate(()=>probe.undo());assert.equal(await gold(),25);
 await page.evaluate(()=>probe.earn(15000));assert.equal(await gold(),29);
 await page.evaluate(()=>probe.undo());assert.equal(await gold(),29,'free finish undo retains income');
 await page.evaluate(()=>probe.undo());assert.equal(await gold(),104,'renovation undo retains income');
 await page.evaluate(()=>probe.save());const saved=await page.evaluate(()=>probe.data());await page.reload();await page.waitForFunction(()=>window.probe);assert.deepEqual(await page.evaluate(()=>probe.data()),saved);
 await page.evaluate(()=>probe.earn(5000));assert.equal(await gold(),108,'remainder survives reload, no duplicate payout');
 // Quota failure must not remove a building, credit a refund, or create undo history.
 const before=await page.evaluate(()=>({data:probe.data(),history:probe.history()}));
 await page.evaluate(()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError');};probe.remove();Storage.prototype.setItem=window.realSet;});
 assert.deepEqual(await page.evaluate(()=>({data:probe.data(),history:probe.history()})),before);
 await page.locator('#appeal-summary').click();await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/stillwater-economy-${mobile?'mobile':'desktop'}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 await page.close();console.log(`PASS ${mobile?'mobile':'desktop'} economy: deductions, invalid placement, insufficient funds, cancel, free finishes, identity, refunds/undo, income/reload, atomic quota failure, HUD`);
}}finally{await browser.close();}
