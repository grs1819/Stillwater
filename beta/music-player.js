// Stream only the current and upcoming track. Ambience is owned by audio.js.
export function createSequence(count,random=Math.random){
  let bag=[],history=[],cursor=-1;
  function fill(){
    bag=Array.from({length:count},(_,i)=>i);
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    if(count>1&&bag[0]===history.at(-1))[bag[0],bag[1]]=[bag[1],bag[0]];
  }
  function peek(direction=1,offset=1){
    if(!count)return null;
    const position=direction<0?Math.max(0,cursor-1):cursor+offset;
    while(position>=history.length){if(!bag.length)fill();history.push(bag.shift());}
    return {position,index:history[position]};
  }
  return {peek,commit(entry){cursor=entry.position;},get canPrevious(){return cursor>0;}};
}
export function playableRange(track,duration){
  const start=Math.max(0,Number(track.start)||0);
  const end=Math.min(Number.isFinite(duration)?duration:Infinity,Number(track.end)>start?Number(track.end):Infinity);
  return {start,end};
}
export function createMusicPlayer({context,bus,tracks,onChange=()=>{},random=Math.random}){
  const sequence=createSequence(tracks.length,random),failed=new Set();
  let current=null,transition=null,pending=null,enabled=false,paused=false,blocked=false,disposed=false,lastTime=context.currentTime;
  const decks=Array.from({length:2},()=>{
    const media=new Audio();media.preload='auto';media.setAttribute('playsinline','');
    const gain=context.createGain();gain.gain.value=0;gain.connect(bus);
    const source=context.createMediaElementSource(media);source.connect(gain);
    const deck={media,gain,source,entry:null,level:0,playing:false};
    media.addEventListener('loadedmetadata',()=>{if(deck.entry&&!deck.playing)seekStart(deck);});
    media.addEventListener('error',()=>{if(deck.entry)failed.add(deck.entry.index);changed();});
    media.addEventListener('waiting',changed);media.addEventListener('playing',changed);
    return deck;
  });
  const timer=setInterval(tick,100);
  function state(){return {paused,title:current?tracks[current.entry.index].title:'',blocked,
    loading:!!pending,transitioning:!!transition,canPrevious:sequence.canPrevious,
    available:tracks.length>failed.size,error:tracks.length>0&&failed.size===tracks.length};}
  function changed(){if(!disposed)onChange(state());}
  function setLevel(deck,value){deck.level=value;deck.gain.gain.setTargetAtTime(value*.65,context.currentTime,.035);}
  function seekStart(deck){const range=playableRange(tracks[deck.entry.index],deck.media.duration);try{deck.media.currentTime=range.start;}catch{}}
  function load(deck,entry){
    if(deck.entry?.position===entry.position&&deck.entry.index===entry.index)return;
    deck.media.pause();deck.playing=false;setLevel(deck,0);deck.entry=entry;
    deck.media.src=new URL(tracks[entry.index].src,import.meta.url).href;deck.media.load();
  }
  function candidate(direction=1){
    for(let i=0;i<tracks.length;i++){
      const entry=sequence.peek(direction);if(!entry)return null;
      if(!failed.has(entry.index))return entry;
      // Broken assets must not trap the automatic queue; valid tracks still cycle.
      if(direction<0)return null;
      sequence.commit(entry);
    }
    return null;
  }
  function preload(){
    if(!current||transition||pending)return;
    const entry=candidate();if(entry)load(decks.find(d=>d!==current),entry);
  }
  function request(direction=1,seconds=1){
    if(disposed||pending||transition||!tracks.length)return;
    if(direction<0&&!sequence.canPrevious)return;
    const entry=candidate(direction);if(!entry){changed();return;}
    const deck=decks.find(d=>d!==current)||decks[0];load(deck,entry);
    pending={deck,seconds};changed();
    if(enabled&&!paused)begin();
  }
  function begin(){
    if(!pending||pending.promise||!enabled||paused)return;
    const job=pending,deck=job.deck;seekStart(deck);
    // Call synchronously from gestures too; do not await metadata before play().
    job.promise=deck.media.play();
    job.promise.then(()=>{
      if(disposed||pending!==job){deck.media.pause();return;}
      if(!enabled||paused){deck.media.pause();job.promise=null;return;}
      blocked=false;deck.playing=true;pending=null;
      const outgoing=current;current=deck;sequence.commit(deck.entry);
      const range=playableRange(tracks[deck.entry.index],deck.media.duration);
      const remaining=outgoing?playableRange(tracks[outgoing.entry.index],outgoing.media.duration).end-outgoing.media.currentTime:Infinity;
      transition={outgoing,incoming:deck,elapsed:0,duration:Math.max(.15,Math.min(job.seconds,remaining,range.end-range.start)),outLevel:outgoing?.level||0};
      lastTime=context.currentTime;changed();
    }).catch(error=>{
      if(disposed||pending!==job)return;
      job.promise=null;
      if(error.name==='NotAllowedError'){blocked=true;changed();return;}
      if(error.name==='AbortError')return;
      failed.add(deck.entry.index);pending=null;changed();
    });
  }
  function resumeDeck(deck){
    if(!deck||deck.resuming||!deck.media.paused||deck.media.ended)return;
    deck.resuming=true;
    deck.media.play().then(()=>{blocked=false;changed();}).catch(error=>{if(error.name==='NotAllowedError')blocked=true;changed();}).finally(()=>{deck.resuming=false;});
  }
  function resume(gesture=false){
    if(!enabled||paused||disposed)return;
    if(blocked&&!gesture)return;
    if(!current&&!pending)request(1,.8);
    if(pending)begin();
    resumeDeck(current);if(transition)resumeDeck(transition.outgoing);
  }
  function tick(){
    const now=context.currentTime,delta=Math.max(0,now-lastTime);lastTime=now;
    if(disposed||!enabled||paused||context.state!=='running')return;
    if(!current){if(!blocked)resume();return;}
    if(transition){
      const t=transition;
      // Wait for incoming playback rather than fading the old song into a stall.
      if(t.incoming.media.readyState>=3&&!t.incoming.media.paused)t.elapsed+=delta;
      const mix=Math.min(1,t.elapsed/t.duration);
      setLevel(t.incoming,mix);if(t.outgoing)setLevel(t.outgoing,t.outLevel*(1-mix));
      if(mix===1){if(t.outgoing){t.outgoing.media.pause();t.outgoing.playing=false;setLevel(t.outgoing,0);}transition=null;preload();changed();}
      return;
    }
    if(pending){if(!blocked)begin();return;}
    const range=playableRange(tracks[current.entry.index],current.media.duration);
    if(failed.has(current.entry.index)||current.media.ended||range.end-current.media.currentTime<=7){
      request(1,7);
    }else preload();
  }
  return {
    get state(){return state();},
    activate(){
      resume(true);
      // Prime the second media element at zero gain in the same user gesture.
      // iOS grants playback permission per element; never wait for the crossfade.
      if(enabled&&!paused&&!current&&pending&&tracks.length>1){
        const standby=decks.find(d=>d!==pending.deck);
        if(!standby.priming){
          load(standby,sequence.peek(1,2));standby.priming=true;
          standby.media.play().then(()=>{
            if(!disposed&&!standby.playing&&pending?.deck!==standby){standby.media.pause();seekStart(standby);}
          }).catch(()=>{}).finally(()=>{standby.priming=false;});
        }
      }
    },
    setEnabled(value){
      if(enabled===value)return;enabled=value;
      if(!value)for(const deck of decks)deck.media.pause();
      lastTime=context.currentTime;if(value)resume();changed();
    },
    toggle(){
      paused=!paused;
      if(paused)for(const deck of decks)deck.media.pause();else resume(true);
      lastTime=context.currentTime;changed();
    },
    next(){request(1,1);},previous(){request(-1,1);},
    dispose(){disposed=true;clearInterval(timer);for(const d of decks){d.media.pause();d.media.removeAttribute('src');d.media.load();d.source.disconnect();d.gain.disconnect();}},
  };
}
