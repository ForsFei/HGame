import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PUZZLES} from '../public/puzzles.js';
import {EMPTY,FILLED,MARKED,cluesOf,lineCandidates,puzzleClues,countSolutions,isUnique,validPuzzle,createGame,setMark,cycle,isSolved,mistakes,filledCount,rowDone,colDone,validSave,dayKey,pickDaily,pickPractice,recordResult,validRecord,summarize} from '../public/engine.js';

const solve=(state)=>{
 for(let i=0;i<state.marks.length;i++)if(state.solution[Math.floor(i/state.size)][i%state.size]==='1')setMark(state,i,FILLED);
 return state;
};
const wrongIndex=(puzzle)=>Array.from({length:puzzle.size*puzzle.size},(_,i)=>i).find(i=>puzzle.solution[Math.floor(i/puzzle.size)][i%puzzle.size]==='0');

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

test('marking cycles through empty, filled and marked',()=>{
 const puzzle=PUZZLES.find(item=>item.size===5);
 const state=createGame(puzzle);
 assert.equal(state.marks.length,25);
 assert.equal(state.status,'playing');
 cycle(state,0);assert.equal(state.marks[0],FILLED);
 cycle(state,0);assert.equal(state.marks[0],MARKED);
 cycle(state,0);assert.equal(state.marks[0],EMPTY);
 assert.throws(()=>setMark(state,0,9));
 assert.throws(()=>setMark(state,99,FILLED));
});

test('finishing only needs correct filled cells, marks are optional',()=>{
 const puzzle=PUZZLES.find(item=>item.size===5);
 const state=createGame(puzzle);
 const blank=wrongIndex(puzzle);
 setMark(state,blank,MARKED);
 assert.equal(filledCount(state),0);
 solve(state);
 assert.equal(state.status,'won');
 assert.ok(isSolved(state));
 assert.ok(validSave(state));
 assert.throws(()=>setMark(state,0,FILLED));
 const rowStates=createGame(puzzle);
 for(let c=0;c<puzzle.size;c++)if(puzzle.solution[0][c]==='1')setMark(rowStates,c,FILLED);
 assert.ok(rowDone(rowStates,0));
 assert.ok(!rowDone(rowStates,1));
 assert.ok(!colDone(rowStates,0)||puzzle.size===1);
});

test('mistakes lists only wrongly filled cells',()=>{
 const puzzle=PUZZLES.find(item=>item.size===5);
 const state=createGame(puzzle);
 const blank=wrongIndex(puzzle);
 setMark(state,blank,FILLED);
 assert.deepEqual(mistakes(state),[blank]);
 setMark(state,blank,MARKED);
 assert.deepEqual(mistakes(state),[]);
 const target=puzzle.solution.join('');
 const filledIndex=target.indexOf('1');
 setMark(state,filledIndex,FILLED);
 assert.deepEqual(mistakes(state),[]);
});

test('save validation rejects malformed grids and resumes',()=>{
 const puzzle=PUZZLES.find(item=>item.size===5);
 const state=createGame(puzzle);
 setMark(state,0,FILLED);
 const restored=JSON.parse(JSON.stringify(state));
 assert.ok(validSave(restored));
 setMark(restored,1,FILLED);
 assert.ok(validSave(restored));
 assert.equal(validSave({...state,size:7}),false);
 assert.equal(validSave({...state,marks:[]}),false);
 assert.equal(validSave({...state,marks:Array(25).fill(9)}),false);
 assert.equal(validSave({...state,status:'won'}),false);
 assert.equal(validSave({...state,mode:'daily'}),false);
 assert.equal(validSave({...state,solution:['11111','11111','11111','11111','11111']}),false);
 assert.equal(validSave({...state,solution:['00000','00000','00000','00000','00000']}),false);
 assert.equal(validSave({...state,startedAt:'nope'}),false);
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
