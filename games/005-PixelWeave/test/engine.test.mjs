import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PUZZLES} from '../public/puzzles.js';
import {EMPTY,FILLED,MARKED,MISTAKE_LIMIT,cluesOf,lineCandidates,puzzleClues,countSolutions,isUnique,validPuzzle,createGame,claim,autofill,isSolved,filledCount,settledCount,mistakesLeft,rowDone,colDone,validSave,dayKey,pickDaily,pickPractice,recordResult,validRecord,summarize} from '../public/engine.js';

const DIAGONAL={id:'TEST-DIAGONAL',size:5,name:'对角线',solution:['10000','01000','00100','00010','00001']};
const solve=(state)=>{
 for(let i=0;i<state.marks.length&&state.status==='playing';i++)if(state.solution[Math.floor(i/state.size)][i%state.size]==='1')claim(state,i,FILLED);
 return state;
};
const zeros=(puzzle,count)=>Array.from({length:puzzle.size*puzzle.size},(_,i)=>i).filter(i=>puzzle.solution[Math.floor(i/puzzle.size)][i%puzzle.size]==='0').slice(0,count);

test('clues describe runs of filled cells',()=>{
 assert.deepEqual(cluesOf([0,0,0]),[]);
 assert.deepEqual(cluesOf([1,1,1,1,1]),[5]);
 assert.deepEqual(cluesOf([1,0,0,1,1]),[1,2]);
 assert.deepEqual(cluesOf([0,1,0,1,0]),[1,1]);
 assert.deepEqual(cluesOf([]),[]);
});

test('line candidates match the combinatorics of each clue',()=>{
 assert.equal(lineCandidates([],5).length,1);
 assert.equal(lineCandidates([5],5).length,1);
 assert.equal(lineCandidates([1],5).length,5);
 assert.equal(lineCandidates([1,1],5).length,6);
 assert.equal(lineCandidates([3],5).length,3);
 assert.equal(lineCandidates([2,2],5).length,1);
 assert.equal(lineCandidates([1,1,1],5).length,1);
 for(const row of lineCandidates([1,2],7)){
  assert.equal(row.length,7);
  assert.deepEqual(cluesOf(row),[1,2]);
 }
});

test('solver counts solutions and detects ambiguous grids',()=>{
 const unique={id:'u',size:5,solution:['00100','01110','11111','01110','00100']};
 const uniqueClues=puzzleClues(unique);
 assert.equal(countSolutions(uniqueClues.rows,uniqueClues.cols,5,2),1);
 assert.ok(isUnique(unique));
 const checker={id:'c',size:5,solution:['10010','01011','00010','10110','00010']};
 const checkerClues=puzzleClues(checker);
 assert.equal(countSolutions(checkerClues.rows,checkerClues.cols,5,2),2);
 assert.equal(isUnique(checker),false);
 assert.equal(isUnique({id:'bad',size:5,solution:['1']}),false);
});

test('every shipped puzzle is valid and uniquely solvable',()=>{
 assert.ok(PUZZLES.length>=25);
 const ids=new Set();
 for(const puzzle of PUZZLES){
  assert.ok(validPuzzle(puzzle),puzzle.id);
  assert.ok(!ids.has(puzzle.id),`duplicate ${puzzle.id}`);
  ids.add(puzzle.id);
  assert.equal(puzzle.solution.length,puzzle.size);
  assert.ok(isUnique(puzzle),`${puzzle.id} is not uniquely solvable`);
 }
 for(const size of [5,10,15])assert.ok(PUZZLES.filter(puzzle=>puzzle.size===size).length>=5,`size ${size}`);
});

test('a correct claim settles the cell at once and locks it',()=>{
 const state=createGame(DIAGONAL);
 assert.equal(state.mistakes,0);
 assert.equal(state.status,'playing');
 const result=claim(state,0,FILLED);
 assert.equal(result.ok,true);
 assert.equal(result.wrong,false);
 assert.equal(result.correct,FILLED);
 assert.equal(state.marks[0],FILLED);
 assert.equal(state.mistakes,0);
 assert.equal(state.status,'playing');
 const again=claim(state,0,FILLED);
 assert.equal(again.ok,false);
 assert.equal(again.settled,true);
 assert.equal(state.marks[0],FILLED);
 assert.equal(state.mistakes,0);
 const zeroResult=claim(state,7,MARKED);
 assert.equal(zeroResult.wrong,false);
 assert.equal(state.marks[7],MARKED);
 assert.throws(()=>claim(state,9,3));
 assert.throws(()=>claim(state,99,FILLED));
});

test('a wrong claim reveals the real value and spends one chance',()=>{
 const puzzle={...DIAGONAL};
 const state=createGame(puzzle);
 const blank=4;
 const wrong=claim(state,blank,FILLED);
 assert.equal(wrong.ok,true);
 assert.equal(wrong.wrong,true);
 assert.equal(wrong.correct,MARKED);
 assert.equal(state.marks[blank],MARKED);
 assert.equal(state.mistakes,1);
 assert.deepEqual(state.wrong,[blank]);
 assert.equal(mistakesLeft(state),MISTAKE_LIMIT-1);
 const one=0;
 const wrongAgain=claim(state,one,MARKED);
 assert.equal(wrongAgain.wrong,true);
 assert.equal(wrongAgain.correct,FILLED);
 assert.equal(state.marks[one],FILLED);
 assert.equal(state.mistakes,2);
});

test('three wrong claims end the run',()=>{
 const puzzle={...DIAGONAL};
 const state=createGame(puzzle);
 const list=zeros(puzzle,3);
 claim(state,list[0],FILLED);
 claim(state,list[1],FILLED);
 assert.equal(state.status,'playing');
 const last=claim(state,list[2],FILLED);
 assert.equal(last.wrong,true);
 assert.equal(state.mistakes,3);
 assert.equal(state.status,'lost');
 assert.ok(Number.isFinite(Date.parse(state.finishedAt)));
 assert.equal(mistakesLeft(state),0);
 assert.throws(()=>claim(state,12,FILLED));
 assert.equal(isSolved(state),false);
 assert.ok(validSave(state));
});

test('finishing the ones of a line auto-fills the rest with zeros',()=>{
 const state=createGame(DIAGONAL);
 const result=claim(state,0,FILLED);
 assert.equal(result.ok,true);
 assert.equal(result.auto.length,8);
 for(let c=0;c<5;c++)assert.equal(state.marks[c],c===0?FILLED:MARKED);
 assert.ok(state.auto.includes(4));
 assert.equal(rowDone(state,0),true);
 assert.equal(rowDone(state,1),false);
});

test('finishing the zeros of a line auto-fills the rest with ones',()=>{
 const state=createGame(DIAGONAL);
 claim(state,0,FILLED);
 claim(state,11,MARKED);
 claim(state,16,MARKED);
 const last=claim(state,21,MARKED);
 assert.ok(last.auto.includes(6));
 assert.equal(state.marks[6],FILLED);
 assert.equal(state.marks[1],MARKED);
 assert.equal(state.marks[7],MARKED);
 assert.equal(state.mistakes,0);
});

test('autofill cascades through rows and columns',()=>{
 const puzzle={id:'TEST-CASCADE',size:5,name:'阶梯',solution:['10000','11000','11100','11110','11111']};
 const state=createGame(puzzle);
 const result=claim(state,0,FILLED);
 assert.equal(result.auto.length,24);
 assert.equal(autofill(state).length,0);
 for(let i=0;i<25;i++)assert.notEqual(state.marks[i],EMPTY);
 assert.equal(state.status,'won');
 assert.equal(settledCount(state),25);
 assert.equal(filledCount(state),15);
 assert.equal(rowDone(state,4),true);
 assert.equal(colDone(state,0),true);
});

test('solving needs only correct 1s because zeros fill themselves',()=>{
 const puzzle=PUZZLES.find(item=>item.size===5);
 const state=solve(createGame(puzzle));
 assert.equal(state.status,'won');
 assert.ok(isSolved(state));
 assert.equal(settledCount(state),25);
 assert.ok(validSave(state));
 assert.throws(()=>claim(state,0,FILLED));
});

test('row and column completion ignores unfinished lines',()=>{
 const state=createGame(DIAGONAL);
 assert.equal(rowDone(state,0),false);
 claim(state,0,FILLED);
 assert.equal(rowDone(state,0),true);
 assert.equal(rowDone(state,1),false);
 assert.equal(colDone(state,0),true);
 assert.equal(colDone(state,1),false);
});

test('save validation accepts settled boards and rejects tampering',()=>{
 const puzzle={...DIAGONAL};
 const fresh=createGame(puzzle);
 assert.ok(validSave(fresh));
 const playing=structuredClone(fresh);
 claim(playing,0,FILLED);
 assert.ok(validSave(playing));
 assert.equal(validSave({...playing,version:1}),false);
 assert.equal(validSave({...playing,size:7}),false);
 assert.equal(validSave({...playing,mistakes:-1}),false);
 assert.equal(validSave({...playing,mistakes:4}),false);
 assert.equal(validSave({...playing,status:'won'}),false);
 const onZero={...structuredClone(playing)};
 onZero.marks[4]=FILLED;
 assert.equal(validSave(onZero),false);
 const badAuto={...structuredClone(playing),auto:[24]};
 assert.equal(validSave(badAuto),false);
 const noList={...structuredClone(playing)};
 delete noList.wrong;
 assert.equal(validSave(noList),false);
 const won=solve(createGame(puzzle));
 assert.ok(validSave(won));
 const missing={...structuredClone(won)};
 missing.marks[24]=EMPTY;
 assert.equal(validSave(missing),false);
 const lost=createGame(puzzle);
 for(const index of zeros(puzzle,3))claim(lost,index,FILLED);
 assert.equal(lost.status,'lost');
 assert.ok(validSave(lost));
 const fakeLost={...structuredClone(lost),mistakes:1};
 assert.equal(validSave(fakeLost),false);
});

test('daily pick is stable per date and rolls over at Beijing midnight',()=>{
 assert.equal(dayKey(Date.parse('2026-10-26T15:59:59Z')),'20261026');
 assert.equal(dayKey(Date.parse('2026-10-26T16:00:00Z')),'20261027');
 const first=pickDaily(PUZZLES,'20261027'),second=pickDaily(PUZZLES,'20261027');
 assert.equal(first.id,second.id);
 assert.equal(first.size,10);
 const days=new Set(Array.from({length:20},(_,i)=>pickDaily(PUZZLES,`202610${String(i+1).padStart(2,'0')}`).id));
 assert.ok(days.size>3);
});

test('practice pick honours size and avoids the current puzzle',()=>{
 const picked=pickPractice(PUZZLES,5,()=>0,'S5-01');
 assert.equal(picked.size,5);
 assert.notEqual(picked.id,'S5-01');
 assert.equal(pickPractice(PUZZLES,15,()=>0).size,15);
 assert.equal(pickPractice(PUZZLES,10,(()=>{let n=0;return ()=>n++*0.07;})(),'S10-01').size,10);
});

test('records dedupe by run and keep one daily entry per date',()=>{
 const puzzle=pickDaily(PUZZLES,'20261027');
 const state=solve(createGame(puzzle,{mode:'daily',date:'20261027'}));
 let records=recordResult([],state);
 assert.equal(records.length,1);
 assert.ok(validRecord(records[0]));
 assert.equal(records[0].size,10);
 assert.equal(recordResult(records,state).length,1);
 const retry=solve(createGame(puzzle,{mode:'daily',date:'20261027'}));
 assert.equal(recordResult(records,retry).length,1);
 const practice=solve(createGame(PUZZLES.find(item=>item.size===5)));
 records=recordResult(records,practice);
 assert.equal(records.length,2);
 assert.equal(validRecord({...records[0],size:7}),false);
 assert.equal(validRecord({...records[0],mode:'daily',date:null}),false);
 assert.equal(recordResult(records,createGame(puzzle)).length,2);
});

test('summary counts completions by mode',()=>{
 assert.deepEqual(summarize([]),{done:0,daily:0,bySize:{5:0,10:0,15:0}});
 const at=new Date().toISOString();
 const stats=summarize([
  {id:'a',puzzleId:'S5-01',size:5,mode:'practice',date:null,finishedAt:at},
  {id:'b',puzzleId:'S10-01',size:10,mode:'daily',date:'20261027',finishedAt:at},
  {id:'c',puzzleId:'S15-01',size:15,mode:'practice',date:null,finishedAt:at}]);
 assert.equal(stats.done,3);
 assert.equal(stats.daily,1);
 assert.deepEqual(stats.bySize,{5:1,10:1,15:1});
});
