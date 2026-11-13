// Reproduce gesture-gated media separately from a successfully running AudioContext.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/activation-test',r=>r.fulfill({contentType:'text/html',body:'<button id="tap">Sound</button><p id="status"></p>'}));
 await page.goto((process.env.STILLWATER_URL||'http://localhost:5186')+'/activation-test');
 await page.evaluate(async()=>{
  const original=HTMLMediaElement.prototype.play;window.allowMusic=false;window.attempts=0;window.acceptedGesture=false;
  HTMLMediaElement.prototype.play=function(){window.attempts++;window.player=this;if(!allowMusic||!navigator.userActivation.isActive)return Promise.reject(new DOMException('Gesture required','NotAllowedError'));window.acceptedGesture=true;return original.call(this);};
  const {createAudio}=await import('./audio.js');window.engine=createAudio({onStatus:s=>document.querySelector('#status').textContent=s});
 });
 await page.click('#tap');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Tap the speaker'));
 const attempts=await page.evaluate(()=>window.attempts);await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>window.attempts),attempts,'No timer retries for gesture rejection');
 await page.evaluate(()=>window.allowMusic=true);await page.click('#tap');await page.waitForFunction(()=>window.player.currentTime>.2&&!window.player.paused);
 assert.equal(await page.evaluate(()=>window.acceptedGesture),true);
 assert.ok((await page.locator('#status').textContent()).startsWith('Playing:'));
 await page.evaluate(()=>engine.setPreferences({music:0}));assert.equal(await page.locator('#status').textContent(),'Music volume is zero.');
 await page.evaluate(()=>engine.setPreferences({master:0}));assert.equal(await page.locator('#status').textContent(),'Master volume is zero.');
 assert.deepEqual(errors,[]);console.log('PASS: gesture rejection explained, no timer retry loop, later gesture recovers playback, zero-volume diagnostics.');
}finally{await browser.close();}
