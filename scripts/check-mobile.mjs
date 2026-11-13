// Optional Chromium integration checks; no browser dependency is added to the game.
// STILLWATER_URL=http://localhost:5173 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-mobile.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nrenderer.setAnimationLoop(null);controls.enableDamping=false;renderer.render(scene,camera);window.probe={undo,read:()=>({blocks,water,terrain}),selectTool,reset:()=>{camera.position.set(19,20,25);controls.target.set(0,0,0);controls.update();camera.updateMatrixWorld(true);},camera:()=>({pos:camera.position.toArray(),target:controls.target.toArray(),distance:camera.position.distanceTo(controls.target)}),point:(x,y,z)=>{camera.updateMatrixWorld(true);const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};`});
 });
 await page.addInitScript(()=>{if(!sessionStorage.getItem('mobile-seeded')){localStorage.setItem('mosswood-v2',JSON.stringify({blocks:{},peak:12}));sessionStorage.setItem('mobile-seeded','1');}});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5173');await page.waitForFunction(()=>window.probe);
 const cdp=await page.context().newCDPSession(page);
 const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 const pt=(id,x,y)=>({id,x,y}),count=()=>page.evaluate(()=>Object.keys(probe.read().blocks).length);
 const target=async(x=0,y=0,z=0)=>page.evaluate(([x,y,z])=>probe.point(x,y,z),[x,y,z]);
 const tap=async(x=0,y=0,z=0)=>{const p=await target(x,y,z);await page.touchscreen.tap(p.x,p.y);};
 const held=async(x=0,y=0,z=0)=>{const p=await target(x,y,z);await send('touchStart',[pt(1,p.x,p.y)]);await page.waitForTimeout(650);await send('touchEnd',[]);};
 const changed=(a,b)=>a.some((n,i)=>Math.abs(n-b[i])>.01);
 const noMenu=async()=>assert.equal(await page.locator('#touch-menu').isVisible(),false);
 assert.equal(await page.locator('#touch-confirm').count(),0);
 // Single taps edit immediately and show no menu, even with small finger jitter.
 await tap();assert.equal(await count(),1);await noMenu();
 await tap(3,0,0);assert.equal(await count(),2);await noMenu();
 const jitter=await target(-2,0,0);await send('touchStart',[pt(1,jitter.x,jitter.y)]);await send('touchMove',[pt(1,jitter.x+2,jitter.y+1)]);await send('touchEnd',[]);assert.equal(await count(),3);await noMenu();
 await page.evaluate(()=>{probe.undo();probe.reset();});assert.equal(await count(),2);
 // Orbit, pan and pinch retain movement safeguards.
 let before=await page.evaluate(()=>probe.camera());
 await send('touchStart',[pt(1,150,350)]);await send('touchMove',[pt(1,230,390)]);await page.waitForTimeout(650);await send('touchEnd',[]);
 assert(changed(before.pos,(await page.evaluate(()=>probe.camera())).pos));assert.equal(await count(),2);await noMenu();
 before=await page.evaluate(()=>probe.camera());await send('touchStart',[pt(1,100,350),pt(2,230,350)]);await send('touchMove',[pt(1,125,390),pt(2,255,390)]);await send('touchEnd',[]);assert(changed(before.target,(await page.evaluate(()=>probe.camera())).target));
 before=await page.evaluate(()=>probe.camera());await send('touchStart',[pt(1,100,350),pt(2,230,350)]);await send('touchMove',[pt(1,70,350),pt(2,270,350)]);await send('touchEnd',[]);assert((await page.evaluate(()=>probe.camera())).distance<before.distance);
 await page.evaluate(()=>probe.reset());
 await send('touchStart',[pt(1,150,350)]);await send('touchStart',[pt(1,150,350),pt(2,250,350)]);await page.waitForTimeout(650);await send('touchEnd',[pt(1,150,350)]);await send('touchEnd',[]);assert.equal(await count(),2);await noMenu();
 // Holding never builds. Undo reverses an accidental tap in one menu action.
 await held(-2,0,0);assert.equal(await count(),2);assert(await page.locator('#touch-menu').isVisible());await page.locator('#touch-undo').tap();assert.equal(await count(),1);await noMenu();
 await held(0,.5,0);await page.locator('#touch-remove').tap();assert.equal(await count(),0);await noMenu();
 await held(-2,0,0);await page.locator('#touch-undo').tap();assert.equal(await count(),1);
 await held(-2,0,0);await tap(-3,0,0);assert.equal(await count(),1,'Dismissing quick actions does not build');await noMenu();
 await page.evaluate(()=>probe.selectTool('erase'));await tap(0,.5,0);assert.equal(await count(),0);await noMenu();
 await held(-2,0,0);await page.locator('#touch-undo').tap();assert.equal(await count(),1);
 await send('touchStart',[pt(1,190,420)]);await send('touchCancel',[]);await page.waitForTimeout(650);await noMenu();assert.equal(await count(),1);
 // Other selected tools also apply immediately, using existing edit rules.
 await page.evaluate(()=>{probe.selectTool('role');document.querySelector('#building-role').value='cafe';});await tap(0,.5,0);assert.equal(await page.evaluate(()=>probe.read().blocks['0,0,0'].role),'cafe');
 await page.evaluate(()=>probe.selectTool('terrain'));await tap(-4,0,0);assert.equal(await page.evaluate(()=>probe.read().terrain['-4,0']),1);
 await page.evaluate(()=>probe.selectTool('water'));await tap(-2,0,2);assert(await page.evaluate(()=>!!probe.read().water['-2,2']));
 await page.evaluate(()=>probe.selectTool('house'));await tap(-2,0,-2);assert.equal(await count(),2);await noMenu();
 await page.reload();await page.waitForFunction(()=>window.probe);assert.equal(await count(),2);assert(await page.evaluate(()=>!!probe.read().water['-2,2']));await noMenu();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#dock-toggle').tap();await page.locator('[data-tool=camp]').tap();assert(await page.locator('#camp-options').isVisible());await page.locator('#dock-toggle').tap();
 // Desktop clicks remain immediate, including right-click removal.
 await page.evaluate(()=>probe.selectTool('house'));const p=await target(-3,0,-2);await page.mouse.click(p.x,p.y);assert.equal(await count(),3);await noMenu();
 const roof=await target(-3,.5,-2);await page.mouse.click(roof.x,roof.y,{button:'right'});assert.equal(await count(),2);
 await page.emulateMedia({reducedMotion:'reduce'});await held(-3,0,-2);assert.equal(await page.locator('#touch-build').evaluate(e=>getComputedStyle(e).animationName),'none');await page.locator('#touch-cancel').tap();
 assert.deepEqual(errors,[]);console.log('PASS: immediate touch building/removal/roles/terrain/water, no confirmation, hold Undo, camera gestures, cancellation, saves, desktop clicks and mobile menu');
}finally{await browser.close();}
