import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,RuleError,levelById,parse,createGame,solved,move,undo,restart,solve,elapsedSeconds,validSave,recordResult,validRecord,summarize} from '../public/engine.js';

const UP=[0,-1],RIGHT=[1,0],DOWN=[0,1],LEFT=[-1,0];

test('parse understands every glyph',()=>{
 const board=parse({rows:['#####','#@$.#','#*  #','#####']});
 assert.equal(board.width,5);
 assert.equal(board.height,4);
 assert.deepEqual(board.boxes,[7,11]);
 assert.deepEqual(board.goals,[8,11]);
 assert.equal(board.player,6);
 assert.equal(board.walls.length,14);
 const withGoalPlayer=parse({rows:['####','#+ #','####']});
 assert.equal(withGoalPlayer.player,5);
 assert.deepEqual(withGoalPlayer.goals,[5]);
});

test('every built-in level is solvable within its declared par',()=>{
 const ids=new Set();
 for(const level of LEVELS){
  assert.equal(ids.has(level.id),false,'关卡 id 不能重复');
  ids.add(level.id);
  assert.ok(level.par>=1);
  const board=parse(level);
  const state=createGame(level);
  assert.equal(board.player>=0,true,`${level.id} 缺少玩家`);
  assert.equal(board.boxes.length,board.goals.length,`${level.id} 箱位数量不等`);
  assert.ok(board.boxes.length>0);
  assert.equal(solved(state),false,`${level.id} 开局不能已完成`);
  assert.equal(solve(state),level.par,`${level.id} 实测步数与声明不一致`);
 }
 assert.equal(levelById('l8').par,17);
 assert.equal(levelById('l99'),null);
});

test('move walks, blocks on walls and refused moves keep the state',()=>{
 const game=createGame(LEVELS[0]);
 assert.equal(game.player,29);
 const blocked=move(game,...LEFT);
 assert.deepEqual(blocked,{moved:false,pushed:false});
 assert.equal(game.player,29);
 assert.equal(game.moves,0);
 assert.equal(game.status,'ready');
 assert.deepEqual(move(game,...RIGHT),{moved:true,pushed:false});
 assert.equal(game.player,30);
 assert.equal(game.moves,1);
 assert.equal(game.status,'playing');
 assert.ok(Number.isFinite(Date.parse(game.startedAt)));
 assert.throws(()=>move(game,1,1),e=>e.code==='dir');
 assert.throws(()=>move(game,2,0),e=>e.code==='dir');
});

test('pushing moves the box and counts as both a step and a push',()=>{
 const game=createGame(LEVELS[0]);
 move(game,...RIGHT);
 const result=move(game,...UP);
 assert.deepEqual(result,{moved:true,pushed:true});
 assert.equal(game.moves,2);
 assert.equal(game.pushes,1);
 assert.equal(game.boxes.includes(16),true);
 assert.equal(game.boxes.includes(23),false);
 assert.equal(game.player,23);
 assert.equal(game.status,'won');
 assert.throws(()=>move(game,...UP),e=>e.code==='ended');
});

test('undo walks the history back and restores counts',()=>{
 const game=createGame(LEVELS[0]);
 move(game,...RIGHT);
 move(game,...UP);
 assert.equal(game.status,'won');
 assert.equal(undo(game),true);
 assert.equal(game.boxes.includes(23),true);
 assert.equal(game.boxes.includes(16),false);
 assert.equal(game.player,30);
 assert.equal(game.moves,1);
 assert.equal(game.pushes,0);
 assert.equal(game.status,'playing');
 assert.equal(game.finishedAt,null);
 assert.equal(undo(game),true);
 assert.equal(game.player,29);
 assert.equal(game.moves,0);
 assert.equal(undo(game),false);
 assert.equal(game.moves,0);
});

test('restart returns to the opening board',()=>{
 const game=createGame(LEVELS[1]);
 move(game,...RIGHT);
 move(game,...UP);
 restart(game,{now:4000});
 assert.equal(game.moves,0);
 assert.equal(game.pushes,0);
 assert.equal(game.status,'ready');
 assert.equal(game.player,game.start.player);
 assert.deepEqual(game.boxes,game.start.boxes);
 assert.equal(game.history.length,0);
 assert.equal(elapsedSeconds(game),0);
 assert.ok(validSave(game));
});

test('save validation rejects malformed boards',()=>{
 const fresh=createGame(LEVELS[3]);
 assert.ok(validSave(fresh));
 assert.equal(validSave({...fresh,level:'l99'}),false);
 assert.equal(validSave({...fresh,par:99}),false);
 assert.equal(validSave({...fresh,w:99}),false);
 assert.equal(validSave({...fresh,boxes:[]}),false);
 assert.equal(validSave({...fresh,walls:[1,2,3]}),false);
 const onWall={...structuredClone(fresh)};
 onWall.player=onWall.walls[0];
 assert.equal(validSave(onWall),false);
 const stacked={...structuredClone(fresh)};
 stacked.boxes=[stacked.boxes[0],stacked.boxes[0]];
 assert.equal(validSave(stacked),false);
 const stuckInBox={...structuredClone(fresh)};
 stuckInBox.player=stuckInBox.boxes[0];
 assert.equal(validSave(stuckInBox),false);
 const playing=structuredClone(fresh);
 move(playing,...RIGHT);
 assert.equal(playing.moves,1);
 assert.ok(validSave(playing));
 const fakeWin={...structuredClone(playing),status:'won',finishedAt:new Date(0).toISOString()};
 assert.equal(validSave(fakeWin),false);
 const noStart={...structuredClone(fresh)};
 delete noStart.start;
 assert.equal(validSave(noStart),false);
});

test('records keep one entry per run and summarise per level',()=>{
 const game=createGame(LEVELS[0]);
 move(game,...RIGHT);
 move(game,...UP);
 game.startedAt=new Date(0).toISOString();
 game.finishedAt=new Date(45000).toISOString();
 const records=recordResult([],game,new Date(45000).toISOString());
 assert.equal(records.length,1);
 assert.equal(records[0].moves,2);
 assert.equal(records[0].pushes,1);
 assert.equal(records[0].par,2);
 assert.equal(records[0].seconds,45);
 assert.ok(validRecord(records[0]));
 assert.equal(recordResult(records,game).length,1);
 const stats=summarize(records);
 assert.equal(stats.done,1);
 assert.equal(stats.cleared,1);
 assert.equal(stats.bestMoves.l1,2);
 assert.equal(stats.bestTime.l1,45);
 assert.equal(stats.bestMoves.l2,null);
 assert.equal(validRecord({...records[0],level:'l99'}),false);
 assert.equal(validRecord({...records[0],moves:0}),false);
 assert.equal(validRecord({...records[0],par:-1}),false);
 assert.equal(validRecord({...records[0],seconds:-1}),false);
});

test('elapsed time starts on the first move and freezes when solved',()=>{
 const game=createGame(LEVELS[0],{now:1000});
 assert.equal(elapsedSeconds(game,999999),0);
 move(game,...RIGHT);
 const started=Date.parse(game.startedAt);
 assert.equal(elapsedSeconds(game,started+30000),30);
 move(game,...UP);
 assert.equal(Number.isFinite(Date.parse(game.finishedAt)),true);
 assert.equal(elapsedSeconds(game,started+900000),elapsedSeconds(game));
});
