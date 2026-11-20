import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);controls.enableDamping=false;
window.probe={data:currentVillageData,earn:earnDuringPlay,save,undo,edit,selectTool,namespace:saveNamespace,
 place:(x,z)=>edit({position:[x,0,z],normal:[0,1,0],ground:true}),select:i=>edit({position:[0,0,0],buildingId:cabins[i].id}),remove:i=>edit({position:[0,0,0],buildingId:cabins[i].id},true),render:()=>renderer.render(scene,camera)};`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5214');await page.waitForFunction(()=>window.probe);
 const data=()=>page.evaluate(()=>probe.data());
 assert.equal((await data()).skills.xp.construction,0);assert.equal(await page.locator('#cabin-exterior option[value=cedar]').isDisabled(),true);
 // Failed locked placement, preview and baseline earnings never create development XP.
 await page.evaluate(()=>{document.querySelector('#cabin-exterior').value='cedar';probe.place(0,0);document.querySelector('#cabin-exterior').value='honey';});assert.equal((await data()).buildings.length,0);assert.equal((await data()).economy.gold,1000);
 await page.evaluate(()=>probe.earn(5000));assert.equal((await data()).skills.xp.hospitality,0);
 await page.evaluate(()=>probe.place(0,0));assert.equal((await data()).economy.gold,801);assert.equal((await data()).skills.xp.construction,60);assert.match(await page.locator('#skill-toast').textContent(),/Construction.*Level 2/);
 await page.evaluate(()=>probe.undo());assert.equal((await data()).skills.xp.construction,60);assert.equal((await data()).economy.gold,1001);
 await page.evaluate(()=>probe.place(0,0));assert.equal((await data()).skills.xp.construction,60);await page.evaluate(()=>probe.remove(0));await page.evaluate(()=>probe.place(0,0));assert.equal((await data()).skills.xp.construction,60);
 const id=(await data()).buildings[0].id;await page.evaluate(()=>probe.select(0));await page.locator('#business-toggle').click();await page.locator('#business-upgrade').click();assert.equal((await data()).skills.xp.construction,140);assert.match(await page.locator('#skill-toast').textContent(),/Warm cedar.*unlocked/);
 await page.evaluate(()=>probe.undo());assert.equal((await data()).skills.xp.construction,140);await page.evaluate(()=>probe.select(0));await page.locator('#business-toggle').click();await page.locator('#business-upgrade').click();assert.equal((await data()).skills.xp.construction,140);
 await page.locator('#appearance-toggle').click();assert.equal(await page.locator('#cabin-exterior option[value=cedar]').isDisabled(),false);await page.locator('#cabin-exterior').selectOption('cedar');await page.locator('#renovation-confirm').click();assert.equal((await data()).buildings[0].id,id);assert.equal((await data()).buildings[0].appearance.exterior,'cedar');assert.equal((await data()).skills.xp.construction,140);
 await page.evaluate(()=>{probe.selectTool('tree');probe.place(-4,0);});assert.equal((await data()).skills.xp.cultivation,8);await page.evaluate(()=>probe.undo());await page.evaluate(()=>probe.place(-4,0));assert.equal((await data()).skills.xp.cultivation,8);
 for(let i=1;i<8;i++)await page.evaluate(i=>probe.place(-4+i,-4),i);assert.equal((await data()).skills.xp.cultivation,64);assert.match(await page.locator('#skill-toast').textContent(),/Cultivation.*Level 2/);
 await page.evaluate(()=>probe.earn(12500));assert.equal((await data()).skills.xp.hospitality,4);assert.equal((await data()).skills.xp.conservation,0);await page.evaluate(()=>probe.save());const saved=await data();
 await page.reload();await page.waitForFunction(()=>window.probe);assert.deepEqual(await data(),saved);assert.equal(await page.locator('#skill-toast').isHidden(),true);
 await page.evaluate(()=>probe.earn(2500));assert.equal((await data()).skills.xp.hospitality,6);
 // XP, Gold and world edits fail together if storage is unavailable.
 const before=await data();await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};probe.selectTool('tree');probe.place(5,-4);probe.earn(5000);Storage.prototype.setItem=set;});assert.deepEqual(await data(),before);
 await page.locator('#dock-toggle').click();await page.locator('#skills-toggle').click();assert.equal(await page.locator('.skill-card').count(),4);assert.equal(await page.locator('.palette').isVisible(),false);assert.match(await page.locator('[data-skill=construction] .skill-level').textContent(),/3/);assert.match(await page.locator('#skill-unlocks').textContent(),/Unlocked/);
 await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/skills-${mobile?'mobile':'desktop'}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(mobile){for(const viewport of [{width:320,height:568},{width:844,height:390}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('.skills-help summary').click();await page.locator('.skills-help summary').click();}}
 await page.locator('#tasks-toggle').click();assert.equal(await page.locator('#skills-panel').isHidden(),true);await page.locator('#skills-toggle').click();assert.equal(await page.locator('#tasks-panel').isHidden(),true);
 await page.locator('#dock-toggle').click();assert.equal(await page.locator('#skills-toggle').getAttribute('aria-expanded'),'false');assert.deepEqual(errors,[]);
 await page.close();console.log(`PASS ${mobile?'mobile':'desktop'} skills: Gold, locked/earned finish, development records through undo/remove, upgrades, cosmetic exclusion, hospitality, level feedback, reload, atomic failure and compact panel`);
}}finally{await browser.close();}
