import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 for(const touch of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:touch,hasTouch:touch});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const Original=window.Audio;window.Audio=function(){const a=new Original();window.music=a;return a;};});
  await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nrenderer.setAnimationLoop(null);renderer.render(scene,camera);window.blockCount=()=>Object.keys(blocks).length;'});});
  await page.goto(process.env.STILLWATER_URL||'http://localhost:5187');await page.waitForFunction(()=>window.blockCount);
  const before=await page.evaluate(()=>blockCount());assert.equal(await page.evaluate(()=>!!window.music),false);
  if(touch)await page.locator('#dock-toggle').tap();else await page.locator('#dock-toggle').click();
  await page.waitForFunction(()=>window.music&&!music.paused&&music.currentTime>.2);
  assert.equal(await page.evaluate(()=>blockCount()),before,'Opening a menu starts music without building');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: first desktop click and mobile tap on build menu start music without construction.');
}finally{await browser.close();}
