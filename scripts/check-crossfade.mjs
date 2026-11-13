import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {MUSIC_TRACKS}=await import('../audio.js');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Math.random=()=>0;window.media=[];window.musicGains=[];window.noiseVoices=0;
  const Original=window.Audio;window.Audio=function(){const a=new Original();window.media.push(a);return a;};
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   constructor(){super();window.audioContext=this;}
   createMediaElementSource(a){const source=super.createMediaElementSource(a),connect=source.connect.bind(source);source.connect=(gain)=>{musicGains.push(gain);return connect(gain);};return source;}
   createBufferSource(){noiseVoices++;return super.createBufferSource();}
   createOscillator(){noiseVoices++;return super.createOscillator();}
  };
 });
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nrenderer.setAnimationLoop(null);renderer.render(scene,camera);window.engine=sound;window.countBlocks=()=>Object.keys(blocks).length;'});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5190');await page.waitForFunction(()=>window.engine);
 assert.equal(await page.evaluate(()=>media.length),0);
 const count=await page.evaluate(()=>countBlocks());await page.locator('#audio-toggle').tap();
 const settled=()=>page.waitForFunction(()=>engine.musicState.title&&!engine.musicState.transitioning&&!engine.musicState.loading);
 await settled();assert.equal(await page.evaluate(()=>media.length),2,'Only two streaming elements');
 const first=await page.evaluate(()=>engine.musicState.title);
 // Pausing the soundtrack leaves Web Audio running and woodland events scheduled.
 await page.locator('#music-play').tap();assert.equal(await page.evaluate(()=>engine.musicState.paused),true);
 const before=await page.evaluate(()=>noiseVoices);
 await page.waitForFunction(n=>noiseVoices>n,before,{timeout:18000});
 assert.equal(await page.evaluate(()=>audioContext.state),'running');assert.ok(await page.evaluate(()=>media.every(a=>a.paused)));
 await page.locator('#music-play').tap();await page.waitForFunction(()=>media.some(a=>!a.paused));
 // Inspect a real seven-second automatic crossfade near the measured end offset.
 await page.evaluate(tracks=>{
  const active=media.find(a=>!a.paused),track=tracks.find(t=>active.src.endsWith(t.src.slice(1)));active.currentTime=track.end-7.3;
 },MUSIC_TRACKS);
 await page.waitForFunction(()=>engine.musicState.transitioning);
 const overlap=await page.evaluate(async()=>{
  const start=performance.now();let minSum=Infinity,both=0,didPause=false;
  while(engine.musicState.transitioning){
   engine.unlock(); // Ordinary game interactions must not reset the fade clock.
   const levels=musicGains.map(g=>g.gain.value);minSum=Math.min(minSum,levels.reduce((a,b)=>a+b,0));
   if(media.every(a=>!a.paused)&&levels.every(v=>v>.02))both++;
   if(both>15&&!didPause){
    didPause=true;engine.toggleMusic();
    if(media.some(a=>!a.paused)||audioContext.state!=='running')throw Error('Music-only pause during fade failed');
    await new Promise(r=>setTimeout(r,250));engine.toggleMusic();
   }
   await new Promise(r=>setTimeout(r,100));
  }
  return {duration:performance.now()-start,minSum,both};
 });
 assert.ok(overlap.duration>5800&&overlap.duration<8500,JSON.stringify(overlap));
 assert.ok(overlap.minSum>.5,'No zero-gain gap');assert.ok(overlap.both>40,'Both tracks overlap audibly');
 const second=await page.evaluate(()=>engine.musicState.title);assert.notEqual(second,first);
 await page.locator('#music-previous').tap();await settled();assert.equal(await page.evaluate(()=>engine.musicState.title),first);
 await page.locator('#music-next').tap();await settled();assert.equal(await page.evaluate(()=>engine.musicState.title),second);
 const seen=new Set([first,second]);
 for(let i=2;i<12;i++){
  await page.locator('#music-next').tap();await settled();
  const title=await page.evaluate(()=>engine.musicState.title);assert.ok(!seen.has(title),'Unique track within cycle');seen.add(title);
  assert.ok(await page.evaluate(()=>media.filter(a=>!a.paused).every(a=>a.duration>179&&a.duration<181)));
 }
 const last=await page.evaluate(()=>engine.musicState.title);await page.locator('#music-next').tap();await settled();assert.notEqual(await page.evaluate(()=>engine.musicState.title),last,'No repeat across reshuffle');
 assert.equal(seen.size,12);
 await page.locator('#music-play').tap();await page.locator('#music-next').tap();assert.ok(await page.evaluate(()=>media.every(a=>a.paused)));
 await page.locator('#music-play').tap();await settled();
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>audioContext.state==='suspended');assert.ok(await page.evaluate(()=>media.every(a=>a.paused)));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>audioContext.state==='running');
 assert.equal(await page.evaluate(()=>countBlocks()),count);assert.deepEqual(errors,[]);
 for(const id of ['music-previous','music-play','music-next']){const box=await page.locator('#'+id).boundingBox();assert.ok(box.width>=44&&box.height>=44);}
 await page.screenshot({path:'/tmp/stillwater-crossfade-mobile.png'});
 console.log('PASS: all 12 tracks, seven-second overlap with nonzero combined gain, preload, shuffle uniqueness/wrap, previous history, manual crossfades, music-only pause with continuing ambience, paused skip, lifecycle and mobile controls.');
}finally{await browser.close();}
