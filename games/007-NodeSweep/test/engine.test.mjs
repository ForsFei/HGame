import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,RuleError,neighbours,cluesOf,solvable,generate,createGame,reveal,toggleFlag,flagsLeft,openedCount,checkWin,elapsedSeconds,validSave,recordResult,validRecord,summarize,levelOf,dayKey,pickDailyLevel,recordDaily,validDailyRecord,dailyBest} from '../public/engine.js';

const seeded=seed=>{let a=seed>>>0;return()=>{a=(a*1103515245+12345)&0x7fffffff;return a/0x7fffffff;};};
const SPARE=[8,17,26,35,44,53,62,71,72,73,74,75,76,77,78,79];
const blank=(size,mines=[])=>{
 const level=LEVELS.find(item=>item.size===size);
 const state=createGame(level);
 state.mine=new Array(size*size).fill(false);
 for(const index of mines)state.mine[index]=true;
 let missing=level.mines-mines.length;
 for(const index of SPARE){
  if(missing<=0)break;
  if(state.mine[index])continue;
  state.mine[index]=true;
  missing--;
 }
 state.status='playing';
 state.firstIndex=0;
 state.startedAt=new Date(0).toISOString();
 state.finishedAt=null;
 return state;
};

test('neighbours counts corners, edges and centre',()=>{
 assert.equal(neighbours(0,9).length,3);
 assert.equal(neighbours(8,9).length,3);
 assert.equal(neighbours(4,9).length,5);
 assert.equal(neighbours(40,9).length,8);
 assert.deepEqual(neighbours(0,3),[1,3,4]);
 assert.ok(!neighbours(0,9).includes(0));
});

test('clues count adjacent mines and mark mines as -1',()=>{
 const size=3;
 const mine=new Array(9).fill(false);
 mine[0]=true;
 const clues=cluesOf(mine,size);
 assert.equal(clues[0],-1);
 assert.equal(clues[1],1);
 assert.equal(clues[4],1);
 assert.equal(clues[8],0);
});

test('solvable accepts a forced layout and rejects an ambiguous one',()=>{
 const clear=new Array(81).fill(false);
 assert.ok(solvable(clear,9,40));
 const single=new Array(81).fill(false);
 single[0]=true;
 assert.ok(solvable(single,9,40));
 const spread=new Array(81).fill(false);
 for(const index of [0,8,72,80])spread[index]=true;
 assert.equal(solvable(spread,9,40),true);
 const corner=new Array(81).fill(false);
 for(const index of [2,44,51,54,56,57,58,75])corner[index]=true;
 assert.equal(solvable(corner,9,0),false);
});

test('generated boards keep the first click safe and stay guess-free',()=>{
 for(const level of LEVELS){
  const random=seeded(level.size*31+7);
  const first=Math.floor(level.size*level.size/2);
  const result=generate(level.size,level.mines,first,random);
  assert.ok(result.solvable,`${level.id}`);
  assert.equal(result.mine.filter(Boolean).length,level.mines);
  for(const spot of [first,...neighbours(first,level.size)])assert.equal(result.mine[spot],false,`${level.id} ${spot}`);
  assert.ok(solvable(result.mine,level.size,first));
 }
});

test('first reveal generates the board and floods open zero areas',()=>{
 const state=createGame(LEVELS[0]);
 assert.equal(state.status,'ready');
 const result=reveal(state,40,seeded(3));
 assert.equal(state.status,'playing');
 assert.ok(result.opened>1);
 assert.equal(state.mine.filter(Boolean).length,10);
 assert.ok(state.open[40]);
 assert.equal(openedCount(state),result.opened);
 assert.equal(state.firstIndex,40);
});

test('hitting a mine ends the round and exposes every mine',()=>{
 const state=blank(9,[0,1,2,3,4,5,6,7,8,9]);
 const result=reveal(state,0);
 assert.equal(result.exploded,true);
 assert.equal(state.status,'lost');
 for(const index of [0,1,2,3,4,5,6,7,8,9])assert.ok(state.open[index]);
 assert.throws(()=>reveal(state,50),error=>error instanceof RuleError&&error.code==='ended');
 assert.throws(()=>toggleFlag(state,50),error=>error.code==='ended');
});

test('clearing every safe cell wins the round',()=>{
 const state=blank(9,[80]);
 const result=reveal(state,0);
 assert.equal(result.exploded,false);
 for(let index=0;index<81&&state.status==='playing';index++)if(!state.mine[index]&&!state.open[index])reveal(state,index);
 assert.equal(state.status,'won');
 assert.ok(checkWin(state));
 assert.equal(state.open[80],false);
 assert.ok(validSave(state));
});

test('flags toggle, block revealing and respect opened cells',()=>{
 const state=blank(9,[0]);
 assert.equal(toggleFlag(state,40),true);
 assert.equal(flagsLeft(state),9);
 assert.deepEqual(reveal(state,40),{opened:0,exploded:false});
 assert.equal(toggleFlag(state,40),false);
 assert.equal(flagsLeft(state),10);
 reveal(state,1);
 assert.equal(state.status,'playing');
 assert.equal(toggleFlag(state,1),false);
 assert.equal(toggleFlag(state,80),true);
 assert.throws(()=>toggleFlag(state,999),error=>error.code==='index');
 assert.throws(()=>reveal(state,999),error=>error.code==='index');
});

test('elapsed time counts from the first click and freezes at the end',()=>{
 const state=createGame(LEVELS[0],{now:0});
 assert.equal(elapsedSeconds(state,5000),0);
 state.status='playing';
 state.startedAt=new Date(1000).toISOString();
 assert.equal(elapsedSeconds(state,61000),60);
 state.status='won';
 state.finishedAt=new Date(31000).toISOString();
 assert.equal(elapsedSeconds(state,999999),30);
});

test('save validation rejects malformed boards',()=>{
 const fresh=createGame(LEVELS[1]);
 assert.ok(validSave(fresh));
 assert.equal(validSave({...fresh,size:11}),false);
 assert.equal(validSave({...fresh,level:'small'}),false);
 assert.equal(validSave({...fresh,mines:5}),false);
 assert.equal(validSave({...fresh,open:[]}),false);
 assert.equal(validSave({...fresh,mine:{}}),false);
 const dirty=structuredClone(fresh);
 dirty.open[0]=true;
 assert.equal(validSave(dirty),false);
 const game=blank(9,[80]);
 assert.ok(validSave(game));
 const overlap=structuredClone(game);
 overlap.flag[0]=true;
 overlap.open[0]=true;
 assert.equal(validSave(overlap),false);
 const shortMines=structuredClone(game);
 shortMines.mine=shortMines.mine.map(()=>false);
 assert.equal(validSave(shortMines),false);
 const fakeWin=structuredClone(game);
 fakeWin.status='won';
 fakeWin.finishedAt=new Date(0).toISOString();
 assert.equal(validSave(fakeWin),false);
 const lostNoMine=structuredClone(game);
 lostNoMine.status='lost';
 lostNoMine.finishedAt=new Date(0).toISOString();
 assert.equal(validSave(lostNoMine),false);
 assert.equal(validSave({...fresh,daily:'2026-10-27'}),false);
 assert.ok(validSave({...fresh,daily:'20261027'}));
 assert.ok(validSave({...fresh,daily:undefined}));
});

test('restored game keeps its board and continues',()=>{
 const state=blank(9,[0]);
 reveal(state,1);
 assert.equal(state.status,'playing');
 assert.equal(openedCount(state),1);
 const restored=JSON.parse(JSON.stringify(state));
 assert.ok(validSave(restored));
 assert.deepEqual(restored.open,state.open);
 assert.deepEqual(restored.mine,state.mine);
 reveal(restored,2);
 assert.ok(openedCount(restored)>1);
});

test('records keep one entry per run and summarise best times',()=>{
 const state=blank(9,[80]);
 state.startedAt=new Date(0).toISOString();
 state.finishedAt=new Date(75000).toISOString();
 state.status='won';
 const records=recordResult([],state);
 assert.equal(records.length,1);
 assert.equal(records[0].seconds,75);
 assert.ok(validRecord(records[0]));
 assert.equal(recordResult(records,state).length,1);
 const stats=summarize(records);
 assert.equal(stats.done,1);
 assert.equal(stats.best.small.length,1);
 assert.equal(stats.bestTime.small,75);
 assert.equal(stats.bestTime.large,null);
 assert.equal(validRecord({...records[0],size:11}),false);
 assert.equal(validRecord({...records[0],seconds:-1}),false);
});

test('daily level rotates by date and level sizes stay in sync',()=>{
 assert.equal(levelOf(9).id,'small');
 assert.equal(levelOf(99),null);
 assert.equal(dayKey(Date.parse('2026-10-26T15:59:59Z')),'20261026');
 assert.equal(dayKey(Date.parse('2026-10-26T16:00:00Z')),'20261027');
 const days=new Set(Array.from({length:12},(_,i)=>pickDailyLevel(`202601${String(i+1).padStart(2,'0')}`).id));
 assert.ok(days.size>1);
});

test('daily runs keep one best time per date',()=>{
 const finish=(level,date,started,finished)=>{
  const state=createGame(level,{daily:date});
  state.status='won';
  state.startedAt=new Date(started).toISOString();
  state.finishedAt=new Date(finished).toISOString();
  return state;
 };
 const today=finish(LEVELS[1],'20261027',0,90000);
 let daily=recordDaily([],today);
 assert.equal(daily.length,1);
 assert.equal(daily[0].seconds,90);
 assert.equal(daily[0].level,'medium');
 assert.equal(recordDaily(daily,finish(LEVELS[1],'20261027',0,120000)).length,1);
 assert.equal(recordDaily(daily,finish(LEVELS[1],'20261027',0,120000))[0].seconds,90);
 daily=recordDaily(daily,finish(LEVELS[1],'20261027',0,45000));
 assert.equal(daily.length,1);
 assert.equal(daily[0].seconds,45);
 daily=recordDaily(daily,finish(LEVELS[0],'20261028',0,30000));
 assert.equal(daily.length,2);
 assert.equal(dailyBest(daily,'20261028').level,'small');
 assert.equal(dailyBest(daily,'20260101'),null);
 const free=finish(LEVELS[0],'20261027',0,10000);
 free.daily=null;
 assert.equal(recordDaily(daily,free),daily);
 assert.ok(validDailyRecord(daily[0]));
 assert.equal(validDailyRecord({...daily[0],date:'2026-10-27'}),false);
 assert.equal(validDailyRecord({...daily[0],size:11}),false);
 assert.equal(validDailyRecord({...daily[0],seconds:-1}),false);
 assert.equal(recordDaily(daily,{...today,status:'playing'}),daily);
});
