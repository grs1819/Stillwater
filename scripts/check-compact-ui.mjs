import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const viewport of [{width:1280,height:850},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
 const mobile=viewport.width<600||viewport.height<500,page=await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
clearInterval(incomeTimer);renderer.setAnimationLoop(null);controls.enableDamping=false;
window.probe={data:currentVillageData,undo,edit,selectTool,select:()=>edit({position:[0,0,0],buildingId:cabins[0].id}),point:(x,y,z)=>{camera.updateMatrixWorld(true);const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};},render:()=>renderer.render(scene,camera)};`});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5207');await page.waitForFunction(()=>window.probe);
 await page.locator('#dock-toggle').click();assert.equal(await page.locator('[data-tool]').count(),8);assert.equal(await page.locator('[data-tool=role]').count(),0);assert.equal(await page.locator('#appearance-panel').isHidden(),true);assert.equal(await page.locator('#business-toggle').isHidden(),true);
 const height=()=>page.locator('.dock-panel').evaluate(e=>e.getBoundingClientRect().height);
 if(mobile)assert.ok(await height()<310,'placement drawer stays compact');
 await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/compact-placement-${viewport.width}.png`});
 await page.locator('#appearance-toggle').click();await page.locator('#cabin-roof').selectOption('slate');await page.locator('#appearance-toggle').click();await page.locator('#dock-toggle').click();
 await page.evaluate(()=>probe.edit({position:[0,0,0],normal:[0,1,0],ground:true}));await page.evaluate(()=>probe.select());
 assert.equal(await page.locator('#appearance-panel').isHidden(),true);assert.equal(await page.locator('#business-panel').isHidden(),true);assert.ok(await height()<250,'selection drawer stays compact');
 await page.evaluate(()=>probe.render());await page.screenshot({path:`/tmp/compact-selected-${viewport.width}.png`});
 const before=await page.evaluate(()=>probe.data());await page.locator('#appearance-toggle').click();await page.locator('#cabin-design').selectOption('woodland');await page.locator('#business-toggle').click();assert.deepEqual(await page.evaluate(()=>probe.data()),before,'switching panels cancels unsaved renovation');assert.equal(await page.locator('#appearance-panel').isHidden(),true);assert.equal(await page.locator('#business-panel').isVisible(),true);
 await page.locator('#appearance-toggle').click();assert.equal(await page.locator('#business-panel').isHidden(),true);await page.locator('#cabin-exterior').selectOption('birch');await page.locator('#renovation-confirm').click();assert.equal(await page.evaluate(()=>probe.data().buildings[0].appearance.exterior),'birch');
 await page.locator('#cabin-new').click();await page.locator('#building-mode').selectOption('freeform');
 await page.evaluate(()=>{probe.edit({position:[-4,0,0],normal:[0,1,0],ground:true});probe.edit({position:[-3,0,0],normal:[0,1,0],ground:true});});
 const freeBefore=await page.evaluate(()=>probe.data());await page.locator('#freeform-inspect').click();const p=await page.evaluate(()=>probe.point(-4,.5,0));if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
 assert.equal(await page.locator('#role-options').isVisible(),true);assert.deepEqual(await page.evaluate(()=>probe.data()),freeBefore,'selection does not build or spend');await page.locator('#building-role').selectOption('cafe');assert.equal(await page.evaluate(()=>probe.data().blocks['-3,0,0'].role),'cafe');await page.evaluate(()=>probe.undo());assert.equal(await page.evaluate(()=>probe.data().blocks['-3,0,0'].role),undefined);
 await page.locator('#purpose-back').click();await page.locator('#dock-toggle').click();await page.keyboard.press('8');assert.equal(await page.locator('[data-tool=erase]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();console.log(`PASS compact UI ${viewport.width}: eight tools, drawer bounds, progressive disclosure, canceled drafts, freeform selection/purpose/undo, shortcut`);
}}finally{await browser.close();}
