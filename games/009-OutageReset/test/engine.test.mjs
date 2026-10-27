import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,RuleError,neighbours,toggleAt,solve,minimumMoves,solved,litCount,generate,levelOf,createGame,press,restart,elapsedSeconds,validSave,recordResult,validRecord,summarize} from '../public/engine.js';

const seeded=seed=>{let a=seed>>>0;return()=>{a=(a*1103515245+12345)&0x7fffffff;return a/0x7fffffff;};};
const stateOf=(size,level,lights,extra={})=>({version:1,id:'run',size,level,lights:[...lights],initial:[...lights],moves:0,optimal:3,status:'ready',startedAt:new Date(0).toISOString(),finishedAt:null,...extra});

test('neighbours covers the plus shape',()=>{
 assert.deepEqual(neighbours(12,5),[12,13,11,17,7]);
 assert.deepEqual(neighbours(0,5),[0,1,5]);
 assert.deepEqual(neighbours(4,5),[4,3,9]);
 assert.deepEqual(neighbours(24,5),[24,23,19]);
});

test('solve returns presses that clear the board',()=>{
 const random=seeded(31);
 for(const size of [5,6,7]){
  for(let round=0;round<12;round++){
   const lights=Array.from({length:size*size},()=>random()<0.45?1:0);
   const result=solve(lights,size);
   if(!result)continue;
   const copy=[...lights];
   for(const index of result.presses)toggleAt(copy,index,size);
   assert.equal(copy.some(Boolean),false,`size ${size} round ${round}`);
   assert.equal(result.presses.length,result.moves);
   assert.equal(new Set(result.presses).size,result.presses.length);
  }
 }
});

test('solve refuses boards without a solution on 5x5',()=>{
 const random=seeded(11);
 let blocked=0,open=0;
 for(let round=0;round<60;round++){
  const lights=Array.from({length:25},()=>random()<0.5?1:0);
  if(solve(lights,5))open++;else blocked++;
 }
 assert.ok(blocked>0,'5x5 应当存在不可解局面');
 assert.ok(open>0,'5x5 也应当存在可解局面');
 assert.equal(minimumMoves(new Array(25).fill(0),5),0);
 assert.equal(minimumMoves([1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],5),null);
});

test('minimumMoves never exceeds the presses used to build a board',()=>{
 const random=seeded(5);
 const size=6,lights=new Array(size*size).fill(0);
 const used=[3,10,20,35];
 for(const index of used)toggleAt(lights,index,size);
 const best=minimumMoves(lights,size);
 assert.ok(best!==null);
 assert.ok(best<=used.length,`${best} <= ${used.length}`);
});

test('generate always returns a solvable board that is not already clear',()=>{
 for(const level of LEVELS){
  const random=seeded(level.size*13+1);
  for(let round=0;round<6;round++){
   const {lights,optimal}=generate(level.size,random,level.minMoves);
   assert.ok(optimal!==null);
   assert.ok(optimal>=level.minMoves,`${level.id} optimal ${optimal}`);
   assert.equal(litCount(lights)>0,true);
   assert.equal(solved(lights,level.size),false);
   assert.equal(minimumMoves(lights,level.size),optimal);
  }
 }
});

test('press toggles the plus shape, counts moves and starts the clock',()=>{
 const state=stateOf(5,'small',new Array(25).fill(0));
 press(state,12);
 for(const index of [7,11,12,13,17])assert.equal(state.lights[index],1,`${index}`);
 assert.equal(litCount(state.lights),5);
 assert.equal(state.moves,1);
 assert.equal(state.status,'playing');
 press(state,0);
 assert.equal(state.lights[0],1);
 assert.equal(state.lights[1],1);
 assert.equal(state.lights[5],1);
 assert.equal(state.moves,2);
 assert.throws(()=>press(state,25),e=>e.code==='index');
 assert.throws(()=>press(state,-1),e=>e.code==='index');
 assert.throws(()=>press(state,1.5),e=>e.code==='index');
});

test('clearing the last lamp wins and freezes the clock',()=>{
 const state=stateOf(5,'small',new Array(25).fill(0));
 press(state,12);
 press(state,12);
 assert.equal(state.status,'won');
 assert.equal(solved(state.lights,5),true);
 assert.equal(state.moves,2);
 assert.ok(Number.isFinite(Date.parse(state.finishedAt)));
 assert.equal(elapsedSeconds(state,Date.parse(state.finishedAt)+30000),elapsedSeconds(state));
 assert.throws(()=>press(state,0),e=>e.code==='ended');
});

test('restart restores the starting board and clears the count',()=>{
 const initial=new Array(25).fill(0);
 toggleAt(initial,7,5);
 const state=stateOf(5,'small',initial);
 press(state,2);
 press(state,7);
 restart(state,{now:5000});
 assert.deepEqual(state.lights,initial);
 assert.equal(state.moves,0);
 assert.equal(state.status,'ready');
 assert.equal(state.finishedAt,null);
 assert.equal(elapsedSeconds(state),0);
 assert.ok(validSave(state));
});

test('save validation rejects malformed boards',()=>{
 const fresh=createGame(LEVELS[1],{random:seeded(3)});
 assert.ok(validSave(fresh));
 assert.equal(validSave({...fresh,size:9}),false);
 assert.equal(validSave({...fresh,level:'small'}),false);
 assert.equal(validSave({...fresh,lights:[]}),false);
 assert.equal(validSave({...fresh,lights:fresh.lights.map(()=>2)}),false);
 assert.equal(validSave({...fresh,initial:null}),false);
 assert.equal(validSave({...fresh,moves:1}),false);
 assert.equal(validSave({...fresh,optimal:-1}),false);
 assert.equal(validSave({...fresh,status:'lost'}),false);
 const tampered={...structuredClone(fresh)};
 tampered.lights=tampered.initial.map(value=>value?0:1);
 assert.equal(validSave(tampered),false);
 const playing={...structuredClone(fresh),status:'playing',moves:2};
 assert.ok(validSave(playing));
 const bogusWin={...structuredClone(playing),status:'won',finishedAt:new Date(0).toISOString()};
 assert.equal(validSave(bogusWin),false);
 const realWin={...structuredClone(playing),lights:new Array(fresh.size*fresh.size).fill(0),status:'won',finishedAt:new Date(0).toISOString()};
 assert.ok(validSave(realWin));
});

test('records keep one entry per run and summarise bests',()=>{
 const state=stateOf(5,'small',new Array(25).fill(0),{status:'won',moves:6,optimal:4});
 state.finishedAt=new Date(72000).toISOString();
 const records=recordResult([],state,new Date(72000).toISOString());
 assert.equal(records.length,1);
 assert.equal(records[0].seconds,72);
 assert.equal(records[0].moves,6);
 assert.equal(records[0].optimal,4);
 assert.ok(validRecord(records[0]));
 assert.equal(recordResult(records,state).length,1);
 const stats=summarize(records);
 assert.equal(stats.done,1);
 assert.equal(stats.bestTime.small,72);
 assert.equal(stats.bestMoves.small,6);
 assert.equal(stats.bestTime.large,null);
 assert.equal(validRecord({...records[0],size:7}),false);
 assert.equal(validRecord({...records[0],moves:0}),false);
 assert.equal(validRecord({...records[0],optimal:0}),false);
 assert.equal(validRecord({...records[0],seconds:-1}),false);
});

test('levels keep size and identity in sync',()=>{
 assert.deepEqual(LEVELS.map(level=>level.size),[5,6,7]);
 assert.deepEqual(LEVELS.map(level=>level.minMoves),[3,4,5]);
 assert.equal(levelOf(6).id,'medium');
 assert.equal(levelOf(9),null);
 for(const level of LEVELS){
  const game=createGame(level,{random:seeded(level.size)});
  assert.equal(game.size,level.size);
  assert.equal(game.level,level.id);
  assert.deepEqual(game.lights,game.initial);
  assert.equal(game.status,'ready');
  assert.equal(game.moves,0);
  assert.ok(game.optimal>=level.minMoves);
  assert.equal(elapsedSeconds(game),0);
 }
});
