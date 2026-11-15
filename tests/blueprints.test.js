import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGNS,renovationQuote,renovateCabin,emptyWorld,validateWorld,cabinAt,footprint,entrance,placementError,customizeCabin,navigationBlocks} from '../blueprints.js';
import {createVillageStore} from '../village-store.js';
import {editTerrain} from '../terrain.js';
const id='12345678-1234-1234-1234-123456789abc';
const cabin=(r=0)=>cabinAt(0,0,r,undefined,id);
test('quarter turns rotate footprint and entrance together',()=>{
 assert.deepEqual(footprint(cabin()),[[0,0],[1,0],[0,1],[1,1]]);
 assert.deepEqual(entrance(cabin(1)),[2,0]);
 for(let r=0;r<4;r++){assert.equal(new Set(footprint(cabin(r)).map(String)).size,4);assert.equal(placementError(cabin(r),emptyWorld()),null);}
});
test('placement rejects bounds, water, obstacles, uneven ground and reserved entrances',()=>{
 const w=emptyWorld(),b=cabin();assert.equal(placementError(b,w),null);
 for(const mutate of [w=>w.water['1,1']='lake',w=>w.blocks['1,1,1']={type:'house'},w=>w.terrain['1,0']=1]){const w=emptyWorld();mutate(w);assert.ok(placementError(b,w));}
 assert.ok(placementError(cabinAt(9,9,0,undefined,id),w));
 w.blocks['0,0,2']={type:'path'};assert.equal(placementError(b,w),null);
 w.buildings.push(b);assert.ok(placementError(cabinAt(0,2),w));
 assert.equal(editTerrain(w.terrain,navigationBlocks(w.blocks,w.buildings,true),w.water,0,3,'raise'),null);
 assert.equal(editTerrain(w.terrain,navigationBlocks(w.blocks,w.buildings),w.water,1,0,'raise'),null);
});
test('customization keeps identity and gameplay; versioned world survives serialization',()=>{
 const w=emptyWorld(),b=cabin();b.gameplay={workers:['worker-1'],inventory:{wood:3},equipment:{level:2},progress:.4};
 const updated=customizeCabin(b,{exterior:'birch',roof:'slate'});assert.equal(updated.id,id);assert.deepEqual(updated.gameplay,b.gameplay);assert.equal(b.appearance.exterior,'honey');
 w.buildings=[updated];assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))),w);
 assert.throws(()=>validateWorld({...w,schemaVersion:3}));assert.throws(()=>validateWorld({...w,buildings:[updated,updated]}));
 assert.throws(()=>validateWorld({...w,buildings:[{...updated,definitionVersion:99}]}));
});
test('2.0 slots never migrate or overwrite previous production data',()=>{
 const map=new Map([['mosswood-v2','original'],['stillwater-beta-v2','beta-original']]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const options={storage,namespace:'stillwater-2-beta-v1',validate:validateWorld,empty:emptyWorld,migrate:false};
 let store=createVillageStore(options);assert.deepEqual(store.active.data,emptyWorld());
 const w=emptyWorld();w.buildings=[cabin()];store.save(w);store=createVillageStore(options);assert.deepEqual(store.active.data,w);
 assert.equal(map.get('mosswood-v2'),'original');assert.equal(map.get('stillwater-beta-v2'),'beta-original');
 const exported=JSON.parse(JSON.stringify({version:2,data:store.active.data}));store.create('Imported',exported.data);assert.equal(store.active.data.buildings[0].id,id);
});

test('three designs renovate without changing identity, transform or functional state',()=>{
 const original=cabin(3);original.gameplay={workers:['one'],equipment:{stove:2},upgrades:{capacity:3},inventory:{logs:4},production:{progress:.6}};
 const snapshot=structuredClone(original);
 for(const design of Object.keys(DESIGNS))for(const exterior of ['honey','birch'])for(const roof of ['moss','slate']){
  const next=renovateCabin(original,{design,appearance:{exterior,roof}});
  assert.equal(next.id,original.id);assert.deepEqual(next.position,original.position);assert.equal(next.rotation,3);assert.deepEqual(next.gameplay,original.gameplay);
  assert.deepEqual(footprint(next),footprint(original));assert.deepEqual(entrance(next),entrance(original));assert.deepEqual(renovationQuote(design),{cost:0,constructionLevel:0});
  const world=emptyWorld();world.buildings=[next];assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(world))),world);
 }
 assert.deepEqual(original,snapshot);assert.throws(()=>renovateCabin(original,{design:'missing'}));assert.throws(()=>renovateCabin(original,{design:'toString'}));
});
