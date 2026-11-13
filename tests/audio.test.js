import test from 'node:test';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
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

});

test('all twelve soundtrack entries match the documented, nonempty encoded assets',()=>{
 const sources=JSON.parse(readFileSync(new URL('../assets/audio/sources.json',import.meta.url)));
 assert.equal(MUSIC_TRACKS.length,12);assert.equal(new Set(MUSIC_TRACKS.map(t=>t.src)).size,12);
 for(const track of MUSIC_TRACKS){
  const file=new URL('../'+track.src,import.meta.url),record=sources.tracks.find(t=>track.src.endsWith('/'+t.file));
  assert.ok(record);assert.equal(track.title,record.title);assert.ok(statSync(file).size>100000);
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),record.mp3_sha256);
  assert.ok(record.loudness_LUFS>=-19&&record.loudness_LUFS<=-17);
  assert.ok(record.true_peak_dBTP<=-1);
 }
});
