// Generated test tones exist only in HTTP mocks, never in the shipped soundtrack.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const samples=8000*6,wav=Buffer.alloc(44+samples*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(Math.sin(i/8000*440*Math.PI*2)*100),44+i*2);
 await page.route('**/test-*.wav',route=>route.fulfill({contentType:'audio/wav',body:wav}));
 await page.route('**/audio-harness',route=>route.fulfill({contentType:'text/html',body:'<button id="start">Start</button>'}));
 const url=process.env.STILLWATER_URL||'http://localhost:5184';await page.goto(url+'/audio-harness');
 await page.evaluate(async()=>{
  Math.random=()=>0;const Original=window.Audio;window.Audio=function(){const element=new Original();window.musicElement=element;return element;};
  const {createAudio}=await import('./audio.js');window.engine=createAudio({storageKey:'audio-test',tracks:[{src:'./test-one.wav'},{src:'./test-two.wav'}]});engine.setPreferences({ambience:0});
 });
 await page.click('#start');await page.waitForFunction(()=>window.musicElement?.currentTime>.2);
 assert.ok(await page.evaluate(()=>musicElement.src.endsWith('test-one.wav')));
 await page.evaluate(()=>engine.setPreferences({muted:true}));assert.equal(await page.evaluate(()=>musicElement.paused),true);
 const paused=await page.evaluate(()=>musicElement.currentTime);await page.waitForTimeout(300);assert.ok(Math.abs(await page.evaluate(()=>musicElement.currentTime)-paused)<.05);
 await page.evaluate(()=>engine.setPreferences({muted:false}));await page.waitForFunction(()=>!musicElement.paused);
 await page.waitForFunction(()=>musicElement.ended);const ended=Date.now();
 await page.waitForTimeout(1000);assert.ok(await page.evaluate(()=>musicElement.src.endsWith('test-one.wav')&&musicElement.paused));
 await page.waitForFunction(()=>musicElement.src.endsWith('test-two.wav')&&!musicElement.paused,{},{timeout:20000});assert.ok(Date.now()-ended>=7500,'Quiet gap between tracks');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>musicElement.paused),true);
 await page.evaluate(()=>engine.dispose());assert.deepEqual(errors,[]);
 console.log('PASS music: streaming, mute/resume, natural end, quiet gap, playlist rotation, inactive pause, cleanup. Test tones not shipped.');
}finally{await browser.close();}
