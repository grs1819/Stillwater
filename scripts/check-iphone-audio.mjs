// Simulate Safari leaving an early resume pending until a later accepted gesture.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/iphone-audio-test',r=>r.fulfill({contentType:'text/html',body:'<button>Tap</button><p id="status"></p>'}));
 await page.goto((process.env.STILLWATER_URL||'http://localhost:5188')+'/iphone-audio-test');
 await page.evaluate(async()=>{
  Object.defineProperty(navigator,'audioSession',{value:{type:'auto'},configurable:true});
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   constructor(){super();window.testContext=this;this.count=0;}
   resume(){this.count++;if(this.count===1)return new Promise(()=>{});return super.resume();}
  };
  const {createAudio}=await import('./audio.js');window.engine=createAudio({onStatus:s=>document.querySelector('#status').textContent=s});
  // The first request deliberately never resolves, like a pre-activation request.
  engine.unlock();
 });
 assert.equal(await page.evaluate(()=>testContext.count),1);
 await page.touchscreen.tap(30,20);
 await page.waitForFunction(()=>testContext.state==='running'&&testContext.count>=2,{},{timeout:5000});
 assert.equal(await page.evaluate(()=>navigator.audioSession.type),'playback');
 assert.ok(!(await page.locator('#status').textContent()).includes('Tap again'));
 await page.evaluate(()=>testContext.suspend());
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Tap again to enable audio.');
 await page.touchscreen.tap(30,20);await page.waitForFunction(()=>testContext.state==='running');
 await page.evaluate(()=>engine.dispose());assert.deepEqual(errors,[]);
 console.log('PASS: pending initial resume does not block later touch, playback session requested, suspended output status and resume recovery.');
}finally{await browser.close();}
