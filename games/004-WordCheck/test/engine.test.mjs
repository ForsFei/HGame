import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LENGTH,MAX_TRIES,WORDS,CATEGORIES,WORD_INDEX,RuleError,evaluate,dayKey,dailyAnswer,createGame,submit,validSave,recordResult,validRecord,summarize} from '../public/engine.js';

test('word pool is five letters, unique and fully classified',()=>{
 assert.ok(WORDS.length>100);
 assert.equal(new Set(WORDS.map(item=>item.w)).size,WORDS.length);
 for(const item of WORDS){
  assert.match(item.w,/^[a-z]{5}$/);
  assert.equal(item.w.length,LENGTH);
  assert.ok(Object.hasOwn(CATEGORIES,item.c),item.w);
  assert.ok(item.n.length>0,item.w);
 }
 assert.equal(WORD_INDEX.size,WORDS.length);
});

test('feedback marks positions and counts duplicate letters',()=>{
 assert.deepEqual(evaluate('array','array'),['hit','hit','hit','hit','hit']);
 assert.deepEqual(evaluate('eagle','level'),['near','miss','miss','near','near']);
 assert.deepEqual(evaluate('rarrr','array'),['near','near','hit','miss','miss']);
 assert.deepEqual(evaluate('class','array'),['miss','miss','near','miss','miss']);
 assert.deepEqual(evaluate('array','class'),['near','miss','miss','miss','miss']);
});

test('submit advances the round and rejects invalid moves atomically',()=>{
 const s=createGame({answer:'class'});
 assert.deepEqual(submit(s,'array'),evaluate('array','class'));
 assert.equal(s.rows.length,1);
 assert.equal(s.status,'playing');
 const before=structuredClone(s);
 assert.throws(()=>submit(s,'array'),error=>error instanceof RuleError&&error.code==='used');
 assert.throws(()=>submit(s,'abc'),error=>error.code==='length');
 assert.throws(()=>submit(s,'abcdef'),error=>error.code==='length');
 assert.throws(()=>submit(s,'ar ray'),error=>error.code==='length');
 assert.deepEqual(s,before);
 submit(s,'class');
 assert.equal(s.status,'won');
 assert.ok(validSave(s));
 assert.throws(()=>submit(s,'build'),error=>error.code==='ended');
});

test('six misses end the round and the save stays valid',()=>{
 const s=createGame({answer:'class'});
 for(const word of ['array','queue','stack','graph','tuple','index'])submit(s,word);
 assert.equal(s.status,'lost');
 assert.equal(s.rows.length,MAX_TRIES);
 assert.ok(validSave(s));
 assert.throws(()=>submit(s,'build'),error=>error.code==='ended');
});

test('daily answer is stable per date and varied across dates',()=>{
 assert.equal(dailyAnswer('20261027'),dailyAnswer('20261027'));
 const days=new Set(Array.from({length:30},(_,i)=>dailyAnswer(`202610${String(i+1).padStart(2,'0')}`)));
 assert.ok(days.size>5);
 const game=createGame({mode:'daily',date:'20261027'});
 assert.equal(game.answer,dailyAnswer('20261027'));
 assert.equal(game.date,'20261027');
 assert.equal(game.mode,'daily');
 assert.equal(createGame().date,null);
});

test('day key rolls over at Beijing midnight',()=>{
 assert.equal(dayKey(Date.parse('2026-10-26T15:59:59Z')),'20261026');
 assert.equal(dayKey(Date.parse('2026-10-26T16:00:00Z')),'20261027');
});

test('save validation rejects tampering and resumes cleanly',()=>{
 const s=createGame({answer:'class'});
 submit(s,'array');
 const restored=JSON.parse(JSON.stringify(s));
 assert.ok(validSave(restored));
 submit(restored,'class');
 assert.equal(restored.status,'won');
 assert.equal(validSave({...s,answer:'zzzzz'}),false);
 assert.equal(validSave({...s,version:2}),false);
 assert.equal(validSave({...s,mode:'daily'}),false);
 assert.equal(validSave({...s,rows:null}),false);
 assert.equal(validSave({...s,startedAt:'nope'}),false);
 assert.equal(validSave({...s,status:'won'}),false);
 const duplicate=structuredClone(s);
 duplicate.rows.push(structuredClone(duplicate.rows[0]));
 assert.equal(validSave(duplicate),false);
 const tampered=structuredClone(s);
 tampered.rows[0].marks[0]=tampered.rows[0].marks[0]==='hit'?'miss':'hit';
 assert.equal(validSave(tampered),false);
 const finished=createGame({answer:'class'});
 submit(finished,'class');
 assert.equal(validSave({...finished,status:'playing'}),false);
});

test('records dedupe by run and keep only one daily result per date',()=>{
 const s=createGame({mode:'daily',date:'20261027'});
 for(const word of ['array','queue','stack','graph','tuple','index'])submit(s,word);
 let records=recordResult([],s);
 assert.equal(records.length,1);
 assert.ok(validRecord(records[0]));
 assert.equal(records[0].won,false);
 records=recordResult(records,s);
 assert.equal(records.length,1);
 const retry=createGame({mode:'daily',date:'20261027'});
 for(const word of ['array','queue','stack','graph','tuple','index'])submit(retry,word);
 records=recordResult(records,retry);
 assert.equal(records.length,1);
 assert.equal(records[0].id,s.id);
 const playing=createGame({answer:'class'});
 assert.equal(recordResult(records,playing).length,1);
 assert.equal(validRecord({id:'x',mode:'daily',date:null,word:'class',attempts:1,won:true,finishedAt:new Date().toISOString()}),false);
 assert.equal(validRecord({id:'x',mode:'practice',date:null,word:'zzzzz',attempts:1,won:true,finishedAt:new Date().toISOString()}),false);
 assert.equal(validRecord({id:'x',mode:'practice',date:null,word:'class',attempts:7,won:true,finishedAt:new Date().toISOString()}),false);
});

test('summary reports rate, streak and distribution',()=>{
 const at=new Date().toISOString();
 const s=summarize([
  {id:'a',date:null,mode:'practice',word:'class',attempts:1,won:true,finishedAt:at},
  {id:'b',date:null,mode:'practice',word:'array',attempts:3,won:true,finishedAt:at},
  {id:'c',date:null,mode:'practice',word:'queue',attempts:6,won:false,finishedAt:at}]);
 assert.equal(s.done,3);
 assert.equal(s.wins,2);
 assert.equal(s.rate,67);
 assert.equal(s.streak,2);
 assert.deepEqual(s.dist,[1,0,1,0,0,0]);
 assert.deepEqual(summarize([]),{done:0,wins:0,rate:0,dist:[0,0,0,0,0,0],streak:0});
});
