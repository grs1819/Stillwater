// Optional browser validation using the same external Playwright setup as check-mobile.mjs.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const url=process.env.STILLWATER_URL||'http://localhost:5184';
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{
  const Original=window.AudioContext;
  window.AudioContext=class extends Original{constructor(...args){super(...args);window.audioContext=this;window.audioSources=0;window.audioAnalyser=this.createAnalyser();audioAnalyser.connect(this.destination);const dest=this.destination;const originalGain=this.createGain.bind(this);this.createGain=()=>{const gain=originalGain(),connect=gain.connect.bind(gain);gain.connect=(target,...rest)=>connect(target===dest?audioAnalyser:target,...rest);return gain;};}createBufferSource(){window.audioSources++;return super.createBufferSource();}createOscillator(){window.audioSources++;return super.createOscillator();}};
 });
 await page.route('**/audio.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(/export const MUSIC_TRACKS = \[[\s\S]*?\];/,'export const MUSIC_TRACKS = [];')});});
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nrenderer.setAnimationLoop(null);renderer.render(scene,camera);window.audioProbe={sound,edit,undo,stageTouchEdit,getState:()=>({blocks,water,terrain}),selectTool};`});});
 await page.goto(url);await page.waitForFunction(()=>window.audioProbe);
 assert.equal(await page.evaluate(()=>!!window.audioContext),false,'No autoplay context');
 await page.locator('#audio-toggle').tap();await page.waitForFunction(()=>window.audioContext?.state==='running');
 assert.equal(await page.locator('#audio-panel').isVisible(),true);
 await page.locator('#volume-master').evaluate(el=>{el.value='40';el.dispatchEvent(new Event('input'));});
 await page.locator('#volume-music').evaluate(el=>{el.value='28';el.dispatchEvent(new Event('input'));});
 await page.locator('#volume-ambience').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input'));});
 assert.equal(await page.evaluate(()=>audioProbe.sound.preferences.master),.4);
 await page.waitForTimeout(180);
 const cues=['wood','stone','tree','water','remove','undo','menuOpen','menuClose','unlock'];
 for(const cue of cues){
  const result=await page.evaluate(async cue=>{
   const before=audioSources;audioProbe.sound.effect(cue);let peak=0;const data=new Float32Array(audioAnalyser.fftSize);
   for(let i=0;i<16;i++){await new Promise(r=>setTimeout(r,20));audioAnalyser.getFloatTimeDomainData(data);for(const n of data)peak=Math.max(peak,Math.abs(n));}
   return {sources:audioSources-before,peak};
  },cue);
  assert.ok(result.sources>0,`${cue} produces voices`);assert.ok(result.peak>0&&result.peak<.5,`${cue} produces bounded output: ${result.peak}`);
 }
 await page.locator('#audio-mute').tap();assert.equal(await page.locator('#audio-mute').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>{const n=audioSources;audioProbe.sound.effect('wood');return audioSources-n;}),0);
 await page.reload();await page.waitForFunction(()=>window.audioProbe);
 assert.equal(await page.evaluate(()=>!!window.audioContext),false);
 assert.deepEqual(await page.evaluate(()=>audioProbe.sound.preferences),{master:.4,music:.28,ambience:0,effects:.55,muted:true});
 await page.locator('#audio-toggle').tap();await page.locator('#audio-mute').tap();await page.waitForFunction(()=>audioContext.state==='running');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>audioContext.state==='suspended');
 assert.equal(await page.evaluate(()=>{const n=audioSources;audioProbe.sound.effect('wood');return audioSources-n;}),0);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>audioContext.state==='running');
 await page.locator('#audio-close').tap();
 const hit={position:[0,0,0],normal:[0,1,0],ground:true};
 await page.waitForTimeout(150);
 await page.evaluate(hit=>audioProbe.stageTouchEdit(hit),hit);
 assert.equal(await page.locator('#touch-confirm').isVisible(),true);
 const before=await page.evaluate(()=>audioSources);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>audioSources),before,'Preview is silent');
 await page.locator('#touch-apply').tap();assert.ok(await page.evaluate(n=>audioSources>n,before),'Confirmed edit sounds');
 assert.ok(await page.evaluate(()=>audioProbe.getState().blocks['0,0,0']));
 await page.waitForTimeout(100);await page.evaluate(()=>audioProbe.undo());assert.equal(await page.evaluate(()=>audioProbe.getState().blocks['0,0,0']),undefined);
 await page.setViewportSize({width:320,height:568});await page.reload();await page.waitForFunction(()=>window.audioProbe);await page.locator('#audio-toggle').tap();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'/tmp/stillwater-audio-mobile.png'});const box=await page.locator('#audio-panel').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=320&&box.y+box.height<=568);
 await page.screenshot({path:'/tmp/stillwater-audio-mobile.png'});
 assert.equal(requests.some(r=>/\.(mp3|ogg|wav)(\?|$)/.test(r)),false,'Empty music manifest makes no asset requests');
 assert.deepEqual(errors,[]);
 console.log('PASS audio: user activation, bounded sound output, volume/mute persistence, focus suspension/resume, silent previews, confirmed edits/Undo, mobile panel, no missing music requests.');
}finally{await browser.close();}
