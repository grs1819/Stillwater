import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence,playableRange} from '../music-player.js';
test('shuffle covers every track once and prevents repeats across cycle boundaries',()=>{
 let seed=123;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 const queue=createSequence(12,random),heard=[];
 for(let i=0;i<120;i++){const entry=queue.peek();assert.deepEqual(queue.peek(),entry,'preloading does not consume queue');queue.commit(entry);heard.push(entry.index);}
 for(let i=0;i<heard.length;i+=12)assert.equal(new Set(heard.slice(i,i+12)).size,12);
 for(let i=1;i<heard.length;i++)assert.notEqual(heard[i-1],heard[i]);
 assert.notDeepEqual(heard.slice(0,12),heard.slice(12,24));
});
test('previous traverses actual history, next resumes that history before drawing new tracks',()=>{
 const queue=createSequence(12,()=>.3),heard=[];
 for(let i=0;i<4;i++){const e=queue.peek();heard.push(e);queue.commit(e);}
 queue.commit(queue.peek(-1));assert.deepEqual(queue.peek(-1),heard[1]);
 assert.deepEqual(queue.peek(),heard[3]);queue.commit(queue.peek());
 assert.equal(queue.peek().position,4);
});
test('preloading a second song does not skip the first or alter shuffle cycles',()=>{
 const queue=createSequence(12,()=>0),first=queue.peek(),second=queue.peek(1,2);
 assert.equal(first.position,0);assert.equal(second.position,1);assert.notEqual(first.index,second.index);
 queue.commit(first);assert.deepEqual(queue.peek(),second);
});
test('playback offsets omit edge silence without rewriting media',()=>{
 assert.deepEqual(playableRange({start:.4,end:176},180),{start:.4,end:176});
 assert.deepEqual(playableRange({start:-2,end:200},180),{start:0,end:180});
 assert.deepEqual(playableRange({},180),{start:0,end:180});
});
