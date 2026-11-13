import test from 'node:test';
import assert from 'node:assert/strict';
import {audioPreferences,AUDIO_DEFAULTS,distanceGain,editSound,MUSIC_TRACKS} from '../audio.js';
test('audio preferences recover corrupt data and clamp finite levels',()=>{
 assert.deepEqual(audioPreferences(null),AUDIO_DEFAULTS);
 assert.deepEqual(audioPreferences({master:Infinity,music:'loud',muted:'false'}),AUDIO_DEFAULTS);
 assert.equal(audioPreferences({master:-1}).master,0);
 assert.equal(audioPreferences({ambience:2}).ambience,1);
 assert.equal(audioPreferences({effects:.23,muted:true}).effects,.23);
 assert.equal(audioPreferences({muted:true}).muted,true);
});
test('nearby sources fade smoothly to silence with camera distance',()=>{
 const source={x:0,y:0,z:0};assert.equal(distanceGain(source,source),1);
 assert.ok(distanceGain({x:0,y:5,z:0},source)>distanceGain({x:0,y:20,z:0},source));
 assert.equal(distanceGain({x:0,y:30,z:0},source),0);
 assert.equal(distanceGain({x:50,y:0,z:0},source),0);
});
test('only actual state changes produce material-specific cues',()=>{
 const empty={blocks:{},water:{},terrain:{}};
 assert.equal(editSound(empty,empty),null);
 for(const [type,cue]of [['house','wood'],['balcony','wood'],['tree','tree'],['path','stone']]){
  const built={...empty,blocks:{'0,0,0':{type}}};assert.equal(editSound(empty,built),cue);assert.equal(editSound(built,empty),'remove');
 }
 const wet={...empty,water:{'0,0':'stream'}};
 assert.equal(editSound(empty,wet),'water');assert.equal(editSound(wet,empty),'remove');
 assert.equal(editSound(empty,{...empty,terrain:{'0,0':1}}),'stone');
 assert.equal(MUSIC_TRACKS.length,0,'Do not ship unlicensed or placeholder music');
});
