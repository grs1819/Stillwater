import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const url=process.env.STILLWATER_URL||'http://localhost:5221';
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:850},isMobile:mobile,hasTouch:mobile});
 await context.addInitScript(()=>{Date.now=()=>Number(localStorage.getItem('test-clock')||1800000000000);localStorage.setItem('mosswood-v2','production-sentinel');});
 await context.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);
window.offline={data:currentVillageData,settle:checkpointIncome,heartbeat:incomeHeartbeat,save,undo,report:currentBusiness,
 seed:()=>{cabins=[buildingAt(CABIN.id,0,0),buildingAt(SHOP.id,4,0)];blocks=validateWorld({...emptyWorld(),blocks:{'0,0,2':{type:'path'}}}).blocks;economy={...emptyWorld().economy,lastIncomeAt:Date.now()};skillProgress=emptyWorld().skills;save();rebuild();updateUI();},
 change:()=>commit(blocks,water,terrain,cabins.map(b=>({...b,gameplay:{businessLevel:3}})),-100),
 addSlot:()=>{checkpointIncome();const id=villages.active.id;loadVillage(villages.create('Second'));return id;},switchTo:id=>{checkpointIncome();loadVillage(villages.select(id));}};`});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.offline);await page.evaluate(()=>offline.seed());
 const tick=ms=>page.evaluate(ms=>localStorage.setItem('test-clock',String(Date.now()+ms)),ms);
 await page.goto(new URL('assets/stillwater-mark.png',url.endsWith('/')?url:url+'/').href);await tick(86400000);await page.goto(url);await page.waitForFunction(()=>window.offline);let data=await page.evaluate(()=>offline.data());assert.equal(data.economy.gold,78760);assert.equal(data.skills.xp.hospitality,69120);assert.equal(await page.locator('#offline-notice').isVisible(),true);assert.match(await page.locator('#offline-summary').textContent(),/24h/);
 await page.locator('#offline-dismiss').click();await page.reload();await page.waitForFunction(()=>window.offline);assert.deepEqual(await page.evaluate(()=>offline.data()),data);assert.equal(await page.locator('#offline-notice').isVisible(),false);
 await page.evaluate(()=>{dispatchEvent(new Event('focus'));dispatchEvent(new Event('pageshow'));document.dispatchEvent(new Event('visibilitychange'));});assert.deepEqual(await page.evaluate(()=>offline.data()),data);
 // Focus is irrelevant: a visible unfocused page earns through the ordinary heartbeat.
 await tick(5000);await page.evaluate(()=>{document.hasFocus=()=>false;offline.heartbeat();});assert.equal(await page.evaluate(()=>offline.data().economy.gold),78764);
 // Hidden/suspended timers may be throttled; visibility restoration catches up once.
 await tick(7200000);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});offline.heartbeat();});assert.equal(await page.evaluate(()=>offline.data().economy.gold),78764);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>offline.data().economy.gold),85244);
 await page.evaluate(()=>offline.seed());await tick(3600000);await page.evaluate(()=>offline.change());assert.equal(await page.evaluate(()=>offline.data().economy.gold),4140,'old rate credited before upgrade charge');await tick(5000);await page.evaluate(()=>offline.settle());assert.equal(await page.evaluate(()=>offline.data().economy.gold),4147);
 await page.evaluate(()=>offline.undo());assert.equal(await page.evaluate(()=>offline.data().economy.gold),4247,'undo keeps subsequent payout');
 data=await page.evaluate(()=>offline.data());await tick(86400000);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};offline.settle();Storage.prototype.setItem=original;});assert.deepEqual(await page.evaluate(()=>offline.data()),data);await page.evaluate(()=>offline.settle());assert.equal(await page.evaluate(()=>offline.data().economy.gold),data.economy.gold+77760);
 // A second tab updates the collection; the older tab must not replay/overwrite its payout.
 const other=await context.newPage();await other.goto(url);await other.waitForFunction(()=>window.offline);await tick(60000);await other.evaluate(()=>offline.settle());const otherData=await other.evaluate(()=>offline.data());await page.evaluate(()=>offline.settle());await page.reload();await page.waitForFunction(()=>window.offline);assert.deepEqual(await page.evaluate(()=>offline.data()),otherData);await other.close();
 const first=await page.evaluate(()=>offline.addSlot());await tick(3600000);await page.evaluate(id=>offline.switchTo(id),first);assert.equal(await page.evaluate(()=>offline.data().economy.gold),otherData.economy.gold+3240);assert.equal(await page.evaluate(()=>localStorage.getItem('mosswood-v2')),'production-sentinel');
 const imported=await page.evaluate(()=>{const d=structuredClone(offline.data());d.economy.gold=1000;d.economy.lastIncomeAt=Date.now()-365*86400000;return d;});
 await page.locator('#village-file').setInputFiles({name:'old-village.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,name:'Imported copy',data:imported}))});await page.waitForFunction(()=>offline.data().economy.gold===1000);assert.equal(await page.evaluate(()=>offline.data().economy.lastIncomeAt===Date.now()),true,'imports start a new local checkpoint');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${mobile?'mobile':'desktop'} offline: 24h uncapped accrual, repeat reload/events, unfocused/hidden resume, rate changes, undo, quota retry, stale tabs, slots and summary`);
}}finally{await browser.close();}
