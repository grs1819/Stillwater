// Original procedural effects and user-supplied Stable Audio music.
// Music provenance and processing: assets/audio/README.md and sources.json.
export const MUSIC_TRACKS = [
  {title:'Quiet Horizon',src:'./assets/audio/quiet-horizon.mp3'},
  {title:'Porchlight',src:'./assets/audio/porchlight.mp3'},
  {title:'Woodland Folk',src:'./assets/audio/woodland-folk.mp3'},
  {title:'Cozy Chillhop',src:'./assets/audio/cozy-chillhop.mp3'},
  {title:'Appalachian Morning',src:'./assets/audio/appalachian-morning.mp3'},
  {title:'Forest Drift',src:'./assets/audio/forest-drift.mp3'},
];
export const AUDIO_DEFAULTS = {master:.65,music:.45,ambience:.35,effects:.55,muted:false};
export function audioPreferences(value={}) {
  const result={...AUDIO_DEFAULTS};
  for(const key of ['master','music','ambience','effects'])if(typeof value?.[key]==='number'&&Number.isFinite(value[key]))result[key]=Math.max(0,Math.min(1,value[key]));
  if(typeof value?.muted==='boolean')result.muted=value.muted;
  return result;
}
export function distanceGain(listener,source,radius=30){
  const d=Math.hypot(listener.x-source.x,listener.y-source.y,listener.z-source.z);
  return Math.max(0,1-d/radius)**2;
}
// Classify committed changes, never previews or rejected placements.
export function editSound(before,after){
  for(const k of Object.keys(before.blocks))if(!after.blocks[k])return 'remove';
  for(const k of Object.keys(before.water))if(!after.water[k])return 'remove';
  if(JSON.stringify(before.water)!==JSON.stringify(after.water))return 'water';
  if(JSON.stringify(before.terrain)!==JSON.stringify(after.terrain))return 'stone';
  for(const [k,b]of Object.entries(after.blocks))if(JSON.stringify(b)!==JSON.stringify(before.blocks[k]))return b.type==='tree'?'tree':b.type==='path'?'stone':'wood';
  return null;
}
// One sparse event at a time, with silence between events. Extend per environment later.
export const SOUNDSCAPES={woodlands:{pause:[6,13],events:['bird','bird','cricket','cicada','wind','water','fire']}};
export function createAudio({storageKey='stillwater-audio-v1',tracks=MUSIC_TRACKS,getListener=()=>({x:0,y:20,z:20}),onStatus=()=>{}}={}){
  let prefs={...AUDIO_DEFAULTS};try{prefs=audioPreferences(JSON.parse(localStorage.getItem(storageKey)));}catch{}
  let ctx,master,buses,noise,timer,media,musicGain,unlocked=false,active=!document.hidden,starting=false,musicBlocked=false;
  let sources=[],voices=new Set(),nextAmbient=0,nextMusic=0,trackIndex=-1,loading=false,trackFinished=true,failed=new Set(),lastEffect=-1;
  let environment='woodlands';
  const random=(a,b)=>a+Math.random()*(b-a);
  const status=()=>onStatus(!ctx?'Click or tap anywhere for sound.':!active?'Sound paused.':prefs.muted?'Sound muted.':!prefs.master?'Master volume is zero.':!prefs.music?'Music volume is zero.':!tracks.length?'Woodland sounds on. Music coming soon.':musicBlocked?'Click or tap anywhere to start music.':failed.size===tracks.length?'Music unavailable. Try refreshing beta.':media&&!media.paused&&tracks[trackIndex]?`Playing: ${tracks[trackIndex].title}`:'Woodland sounds on.');
  function ramp(param,value,seconds=.12){const now=ctx.currentTime;param.cancelScheduledValues(now);param.setTargetAtTime(value,now,Math.max(.01,seconds/3));}
  function apply(){if(!ctx)return; ramp(master.gain,active&&!prefs.muted?prefs.master:0);for(const key of ['music','ambience','effects'])ramp(buses[key].gain,prefs[key]);if(!prefs.music||!prefs.master||prefs.muted)media?.pause();status();}
  function setPreferences(patch){prefs=audioPreferences({...prefs,...patch});try{localStorage.setItem(storageKey,JSON.stringify(prefs));}catch{}apply();status();}
  function init(){
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext){onStatus('Audio is unavailable in this browser.');return false;}
    ctx=new AudioContext();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);buses={};
    for(const key of ['music','ambience','effects']){buses[key]=ctx.createGain();buses[key].gain.value=prefs[key];buses[key].connect(master);}
    // Reuse one short noise buffer. Each voice starts at a random offset.
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noise.getChannelData(0);let brown=0;
    for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.07)/1.02;data[i]=brown*3;}
    if(tracks.length){
      media=new Audio();media.preload='none';media.loop=false;
      musicGain=ctx.createGain();musicGain.gain.value=0;
      ctx.createMediaElementSource(media).connect(musicGain);musicGain.connect(buses.music);
      media.addEventListener('ended',()=>{loading=false;trackFinished=true;nextMusic=ctx.currentTime+random(8,16);status();});
      media.addEventListener('playing',status);
      media.addEventListener('error',()=>{if(trackIndex>=0)failed.add(trackIndex);loading=false;trackFinished=true;nextMusic=ctx.currentTime+10;status();});
    }
    nextAmbient=ctx.currentTime+random(3,6);nextMusic=ctx.currentTime+2;
    timer=setInterval(tick,500);apply();return true;
  }
  async function unlock(){
    if(document.hidden)return;
    active=true;
    try{
      if(!ctx&&!init())return;
      // Call play synchronously inside the gesture, before awaiting AudioContext.
      // Touch browsers may grant media activation only on pointerup/click.
      if(media&&media.paused&&!prefs.muted&&prefs.master&&prefs.music&&(trackIndex<0||musicBlocked||ctx.currentTime>=nextMusic))playMusic();
      if(unlocked&&ctx.state==='running'){apply();return;}
      // Keep gesture playback above this guard: a touch release can arrive while
      // the initial AudioContext resume is still pending.
      if(starting)return;
      starting=true;
      try{await ctx.resume();unlocked=true;apply();}finally{starting=false;}
    }catch{onStatus('Click or tap anywhere to enable audio.');}
  }
  // Soft attack/release, restrained bandwidth, bounded voices; no endless loops.
  function voice({bus='effects',at=0,duration=.25,volume=.1,frequency=500,endFrequency,tonal=false,attack=.012,position=null}){
    if(!ctx||voices.size>=32)return;
    const start=ctx.currentTime+at,end=start+duration;
    const source=tonal?ctx.createOscillator():ctx.createBufferSource();
    const filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type=tonal?'lowpass':'bandpass';filter.frequency.value=frequency;filter.Q.value=tonal?.5:.65;
    if(tonal){source.type='sine';source.frequency.setValueAtTime(frequency,start);if(endFrequency)source.frequency.exponentialRampToValueAtTime(endFrequency,end);}
    else{source.buffer=noise;source.loop=true;source.playbackRate.value=random(.85,1.15);}
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+Math.min(attack,duration*.3));gain.gain.exponentialRampToValueAtTime(.0001,end);gain.gain.setValueAtTime(0,end+.015);
    source.connect(filter);filter.connect(gain);
    let spatial;
    if(position){spatial=ctx.createGain();spatial.gain.value=distanceGain(getListener(),position);gain.connect(spatial);spatial.connect(buses[bus]);}else gain.connect(buses[bus]);
    const item={source,filter,gain,spatial,position};voices.add(item);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();spatial?.disconnect();voices.delete(item);};
    if(tonal)source.start(start);else source.start(start,random(0,1));source.stop(end+.025);
  }
  function effect(kind){
    if(!kind||!unlocked||!active||ctx.state!=='running'||prefs.muted||!prefs.effects||!prefs.master)return;
    const t=ctx.currentTime;if(kind!=='unlock'&&t-lastEffect<.065)return;lastEffect=t;
    const v=random(.85,1.1),f=random(.9,1.1);
    const n=(frequency,duration,volume,at=0)=>voice({frequency:frequency*f,duration,volume:volume*v,at});
    if(kind==='wood'){n(260,.18,.6);n(780,.075,.17,.025);}
    else if(kind==='stone'){n(650,.16,.4);for(let i=0;i<4;i++)n(random(1000,2300),.055,.15,.035+i*.028);}
    else if(kind==='tree'){n(1700,.6,.25);n(420,.23,.3,.08);}
    else if(kind==='water'){n(950,.4,.28);n(2100,.2,.12,.08);}
    else if(kind==='remove'){n(450,.26,.3);n(1300,.18,.15,.07);}
    else if(kind==='undo'){n(750,.18,.22);n(350,.15,.32,.09);}
    else if(kind==='menuOpen'||kind==='menuClose')n(kind==='menuOpen'?850:550,.13,.13);
    else if(kind==='unlock')for(const [i,freq]of [523.25,659.25,783.99].entries())voice({tonal:true,frequency:freq,volume:.075,duration:1.6,attack:.04,at:.12+i*.12});
  }
  function nearest(kind){
    const listener=getListener();return sources.filter(s=>kind==='water'?['stream','river','lake'].includes(s.kind):s.kind===kind).reduce((best,s)=>!best||distanceGain(listener,s)>distanceGain(listener,best)?s:best,null);
  }
  function ambience(kind){
    const bus='ambience',pan=()=>({x:random(-16,16),y:1,z:random(-16,16)});
    if(kind==='bird'){
      const position=pan(),base=random(1900,2700);for(let i=0;i<3;i++)voice({bus,position,tonal:true,frequency:base+random(-150,150),endFrequency:base*random(1.25,1.55),duration:random(.09,.16),volume:.035,attack:.025,at:i*.24});return 1;
    }
    if(kind==='cricket'){
      const position=pan();for(let i=0;i<8;i++)voice({bus,position,tonal:true,frequency:random(3100,3400),duration:.055,volume:.018,attack:.015,at:i*.12});return 1.2;
    }
    if(kind==='cicada'||kind==='wind'){
      const duration=kind==='wind'?4:2.2;voice({bus,position:pan(),frequency:kind==='wind'?600:2600,duration,volume:kind==='wind'?.18:.1,attack:.7});return duration;
    }
    const position=nearest(kind);if(!position||distanceGain(getListener(),position)<.005)return 0;
    if(kind==='fire'){
      for(let i=0;i<6;i++)voice({bus,position,frequency:random(500,1500),duration:random(.045,.13),volume:random(.12,.25),attack:.008,at:i*.3+random(0,.15)});return 2;
    }
    const lake=position.kind==='lake',duration=lake?2.5:3.5;
    voice({bus,position,frequency:lake?500:1100,duration,volume:lake?.22:.3,attack:.65});
    for(let i=0;i<3;i++)voice({bus,position,frequency:random(650,1400),duration:.3,volume:.12,attack:.07,at:.5+i*.6});return duration;
  }
  function playMusic(){
    if(loading||!media||failed.size===tracks.length)return;
    if(trackFinished){
      do{trackIndex=(trackIndex+1)%tracks.length;}while(failed.has(trackIndex));
      media.src=new URL(tracks[trackIndex].src,import.meta.url).href;
      musicGain.gain.value=0;trackFinished=false;
    }
    loading=true;
    media.play().then(()=>{musicBlocked=false;status();}).catch(e=>{
      if(e.name==='NotAllowedError')musicBlocked=true;
      else if(e.name!=='AbortError'){failed.add(trackIndex);trackFinished=true;}
      nextMusic=ctx.currentTime+10;status();
    }).finally(()=>{loading=false;});
  }
  function tick(){
    if(!unlocked||!active||ctx.state!=='running')return;
    for(const item of voices)if(item.spatial)ramp(item.spatial.gain,distanceGain(getListener(),item.position),.5);
    if(prefs.muted||!prefs.master)return;
    const now=ctx.currentTime;
    if(prefs.ambience&&now>=nextAmbient){const config=SOUNDSCAPES[environment],event=config.events[Math.floor(Math.random()*config.events.length)];const duration=ambience(event);nextAmbient=now+duration+random(...config.pause);}
    if(prefs.music&&media){
      if(media.paused&&!musicBlocked&&now>=nextMusic)playMusic();
      if(!media.paused){const remaining=Number.isFinite(media.duration)?media.duration-media.currentTime:10;const fade=Math.min(1,media.currentTime/3,remaining/4);ramp(musicGain.gain,Math.max(0,fade)*.65,.5);}
    }
  }
  function setActive(value){
    active=value;if(!ctx)return;
    if(!value){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(0,ctx.currentTime);media?.pause();for(const item of voices){try{item.source.stop();}catch{}}ctx.suspend().catch(()=>{});}
    else if(unlocked)unlock();
  }
  const onVisibility=()=>setActive(!document.hidden),onBlur=()=>setActive(false),onFocus=()=>{if(!document.hidden)setActive(true);};
  document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('pointerup',unlock,{capture:true});document.addEventListener('click',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
  document.addEventListener('visibilitychange',onVisibility);window.addEventListener('blur',onBlur);window.addEventListener('focus',onFocus);window.addEventListener('pagehide',onBlur);window.addEventListener('pageshow',onFocus);
  return {effect,unlock,setPreferences,get preferences(){return {...prefs};},
    setWorld(value){sources=value;},setEnvironment(value){if(SOUNDSCAPES[value])environment=value;},
    dispose(){clearInterval(timer);media?.pause();for(const item of voices)item.source.stop();ctx?.close();document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('pointerup',unlock,true);document.removeEventListener('click',unlock,true);document.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('blur',onBlur);window.removeEventListener('focus',onFocus);window.removeEventListener('pagehide',onBlur);window.removeEventListener('pageshow',onFocus);},
  };
}
