import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,RuleError,step,rotate,bends,openEnds,reach,solved,generate,levelOf,createGame,turn,liveCount,elapsedSeconds,validSave,recordResult,validRecord,summarize} from '../public/engine.js';

const seeded=seed=>{let a=seed>>>0;return()=>{a=(a*1103515245+12345)&0x7fffffff;return a/0x7fffffff;};};
const N=1,E=2,S=4,W=8;
const loop=()=>{
 const tiles=new Array(16).fill(0);
 tiles[0]=E|S;tiles[1]=W|E;tiles[2]=W|E;tiles[3]=W|S;
 tiles[7]=N|S;tiles[11]=N|S;tiles[15]=N|W;tiles[14]=E|W;
 tiles[13]=E|W;tiles[12]=E|N;tiles[8]=S|N;tiles[4]=S|N;
 return tiles;
};

test('rotate cycles the four orientations and wraps around',()=>{
 assert.equal(rotate(N,1),E);
 assert.equal(rotate(N,2),S);
 assert.equal(rotate(N,3),W);
 assert.equal(rotate(N,4),N);
 assert.equal(rotate(N,-1),W);
 assert.equal(rotate(E|S,1),S|W);
 assert.equal(rotate(N|E|S|W,3),N|E|S|W);
 assert.equal(bends(N|E|S),3);
 assert.equal(bends(0),0);
});

test('step stays inside the board',()=>{
 assert.equal(step(0,0,4),-1);
 assert.equal(step(0,3,4),-1);
 assert.equal(step(0,1,4),1);
 assert.equal(step(0,2,4),4);
 assert.equal(step(15,1,4),-1);
 assert.equal(step(15,2,4),-1);
});

test('open ends count dangling pipes only',()=>{
 const tiles=new Array(16).fill(0);
 tiles[0]=E;
 assert.equal(openEnds(tiles,4),1);
 tiles[1]=W;
 assert.equal(openEnds(tiles,4),0);
 tiles[1]|=S;
 assert.equal(openEnds(tiles,4),1);
 const dead=new Array(16).fill(0);
 dead[0]=N;
 assert.equal(openEnds(dead,4),1);
});

test('solved accepts a closed loop that covers the board',()=>{
 const tiles=[E|S,W|S,N|E,N|W];
 assert.equal(openEnds(tiles,2),0);
 assert.ok(solved(tiles,2));
 assert.equal(reach(tiles,2,0).every(Boolean),true);
});

test('solved rejects a second island with no open ends',()=>{
 const tiles=loop();
 assert.equal(openEnds(tiles,4),0);
 assert.equal(solved(tiles,4),false);
 assert.equal(reach(tiles,4,0).filter(Boolean).length,12);
});

test('generate covers every cell and never starts solved',()=>{
 for(const level of LEVELS){
  for(let round=0;round<8;round++){
   const {tiles,solution,locked}=generate(level.size,seeded(level.size*97+round));
   assert.equal(tiles.length,level.size*level.size);
   assert.equal(tiles.every(mask=>mask>0&&mask<16),true,`${level.id} ${round}`);
   assert.equal(solution.every(mask=>mask>0),true);
   assert.equal(locked.filter(Boolean).length,2);
   for(let index=0;index<tiles.length;index++)if(locked[index])assert.equal(tiles[index],solution[index]);
   assert.ok(solved(solution,level.size),`${level.id} ${round} 解本身必须连通`);
   assert.equal(solved(tiles,level.size),false,`${level.id} ${round} 开局不能已完成`);
  }
 }
});

test('turn rotates only unlocked tiles and counts moves',()=>{
 const state=createGame(LEVELS[0],{random:seeded(7)});
 const before=state.tiles[3];
 assert.equal(turn(state,3,1),true);
 assert.equal(state.tiles[3],rotate(before,1));
 assert.equal(state.moves,1);
 assert.equal(state.status,'playing');
 assert.equal(turn(state,0,1),false);
 assert.equal(state.locked[0],true);
 assert.equal(state.tiles[0],generate(LEVELS[0].size,seeded(7)).solution[0]);
 assert.throws(()=>turn(state,999),e=>e.code==='index');
 assert.throws(()=>turn(state,-1),e=>e.code==='index');
});

test('finishing the last tile wins and freezes the clock',()=>{
 const size=6,level=levelOf(size);
 const {solution,locked}=generate(size,seeded(11));
 const last=locked.findIndex(value=>!value);
 const tiles=solution.map((mask,index)=>locked[index]?mask:(index===last?rotate(mask,-1):mask));
 const state={version:1,id:'run',size,level:level.id,tiles,locked,status:'playing',moves:4,startedAt:new Date(0).toISOString(),finishedAt:null};
 assert.ok(liveCount(state)>0);
 assert.throws(()=>turn(state,size*size),e=>e.code==='index');
 turn(state,last,1);
 assert.equal(state.status,'won');
 assert.equal(state.moves,5);
 assert.ok(Number.isFinite(Date.parse(state.finishedAt)));
 assert.equal(elapsedSeconds(state,Date.parse(state.finishedAt)+60000),elapsedSeconds(state));
 assert.throws(()=>turn(state,last,1),e=>e.code==='ended');
});

test('save validation rejects malformed boards',()=>{
 const fresh=createGame(LEVELS[1],{random:seeded(3)});
 assert.ok(validSave(fresh));
 assert.equal(validSave({...fresh,size:9}),false);
 assert.equal(validSave({...fresh,level:'small'}),false);
 assert.equal(validSave({...fresh,tiles:[]}),false);
 assert.equal(validSave({...fresh,tiles:fresh.tiles.map(()=>16)}),false);
 assert.equal(validSave({...fresh,tiles:fresh.tiles.map(()=>-1)}),false);
 assert.equal(validSave({...fresh,locked:fresh.locked.map(()=>1)}),false);
 assert.equal(validSave({...fresh,moves:2}),false);
 assert.equal(validSave({...fresh,status:'lost'}),false);
 const playing={...structuredClone(fresh),status:'playing',moves:3};
 assert.ok(validSave(playing));
 const finished={...structuredClone(playing),status:'won',finishedAt:new Date(0).toISOString()};
 assert.equal(validSave(finished),false);
 const bogus={...structuredClone(playing),finishedAt:new Date(0).toISOString()};
 assert.equal(validSave(bogus),false);
});

test('records keep one entry per run and summarise bests',()=>{
 const size=6,level=levelOf(size);
 const {solution,locked}=generate(size,seeded(21));
 const last=locked.findIndex(value=>!value);
 const tiles=solution.map((mask,index)=>locked[index]?mask:(index===last?rotate(mask,-1):mask));
 const state={version:1,id:'run-1',size,level:level.id,tiles,locked,status:'playing',moves:9,startedAt:new Date(0).toISOString(),finishedAt:null};
 turn(state,last,1);
 state.finishedAt=new Date(72000).toISOString();
 const records=recordResult([],state,new Date(72000).toISOString());
 assert.equal(records.length,1);
 assert.equal(records[0].seconds,72);
 assert.equal(records[0].moves,10);
 assert.ok(validRecord(records[0]));
 assert.equal(recordResult(records,state).length,1);
 const stats=summarize(records);
 assert.equal(stats.done,1);
 assert.equal(stats.best.small.length,1);
 assert.equal(stats.bestTime.small,72);
 assert.equal(stats.bestMoves.small,10);
 assert.equal(stats.bestTime.large,null);
 assert.equal(validRecord({...records[0],size:8}),false);
 assert.equal(validRecord({...records[0],moves:0}),false);
 assert.equal(validRecord({...records[0],seconds:-1}),false);
});

test('levels keep size and identity in sync',()=>{
 assert.deepEqual(LEVELS.map(level=>level.size),[6,7,8]);
 assert.equal(levelOf(7).id,'medium');
 assert.equal(levelOf(9),null);
 for(const level of LEVELS){
  const game=createGame(level,{random:seeded(level.size)});
  assert.equal(game.size,level.size);
  assert.equal(game.level,level.id);
  assert.equal(game.tiles.length,level.size*level.size);
  assert.equal(game.status,'ready');
  assert.equal(elapsedSeconds(game),0);
 }
});
