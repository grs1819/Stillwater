// Validate the real supplied MP3s, not test tones. Uses external Playwright.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {MUSIC_TRACKS}=await import('../audio.js');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const url=process.env.STILLWATER_URL||'http://localhost:5185';
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[],mp3s=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.mp3'))mp3s.push(r.url());});
 await page.addInitScript(()=>{const Original=window.Audio;window.Audio=function(){const a=new Original();window.trackPlayer=a;return a;};Math.random=()=>0;});
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nrenderer.setAnimationLoop(null);renderer.render(scene,camera);window.soundtrack=sound;'});});
 await page.goto(url);await page.waitForFunction(()=>window.soundtrack);assert.equal(mp3s.length,0,'No pre-gesture downloads');
 await page.locator('#audio-toggle').tap();
 for(const [i,track]of MUSIC_TRACKS.entries()){
  await page.waitForFunction(src=>window.trackPlayer?.src.endsWith(src)&&!trackPlayer.paused&&trackPlayer.currentTime>.1,track.src.slice(1),{timeout:25000});
  const duration=await page.evaluate(()=>trackPlayer.duration);assert.ok(duration>=60&&duration<61);
  assert.equal(await page.locator('#audio-status').textContent(),'Playing: '+track.title);
  if(i===0){
   assert.equal(new Set(mp3s).size,1,'Only current track loads');
   await page.evaluate(()=>soundtrack.setPreferences({music:0}));assert.equal(await page.evaluate(()=>trackPlayer.paused),true);
   await page.evaluate(()=>soundtrack.setPreferences({music:.45}));await page.waitForFunction(()=>!trackPlayer.paused);
  }
  console.log('Decoded and playing:',track.title);
  // Seek to each real file ending to validate the full playlist without a six-minute wait.
  await page.evaluate(()=>{trackPlayer.currentTime=trackPlayer.duration-.25;});await page.waitForFunction(()=>trackPlayer.ended);
  await page.waitForTimeout(1000);assert.ok(await page.evaluate(()=>trackPlayer.paused),'Quiet interval after track');
 }
 await page.waitForFunction(()=>trackPlayer.src.endsWith('quiet-horizon.mp3')&&!trackPlayer.paused,{},{timeout:25000});
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>trackPlayer.paused),true);
 const response=await page.request.get(url+'/assets/audio/quiet-horizon.mp3',{headers:{Range:'bytes=0-99'}});assert.equal(response.status(),206);assert.equal((await response.body()).length,100);assert.equal(response.headers()['content-type'],'audio/mpeg');
 assert.deepEqual(errors,[]);console.log('PASS real soundtrack: six decoded tracks, rotation/wrap, quiet gaps, gesture loading, music volume pause, focus pause, MP3 range serving.');
}finally{await browser.close();}
