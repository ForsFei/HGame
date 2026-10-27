import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startBattle,activate,endTurn,skipReward,forge,validSave} from '../public/engine.js';
import {ensureRunId,recordRun,readRecords,mergeRecords,replayConfig} from '../public/engine.js';
const winFirst=s=>{startBattle(s);activate(s,'i1');activate(s,'i2');endTurn(s);activate(s,'i1');};
const lose=s=>{startBattle(s);while(s.phase==='battle')endTurn(s);return s;};
test('recap measures actual combat, samples before victory healing, and survives continuation',()=>{
 const s=createGame('TRACE');startBattle(s);activate(s,'i1');endTurn(s);activate(s,'i4');activate(s,'i1');
 assert.deepEqual(s.recap,[{floor:0,startHp:40,endHp:40,turns:2,dealt:18,taken:5,healed:5,result:'won'}]);
 skipReward(s);const restored=JSON.parse(JSON.stringify(s));startBattle(restored);while(restored.phase==='battle')endTurn(restored);
 assert.equal(restored.recap.length,2);assert.equal(restored.recap[1].result,'lost');assert.equal(restored.recap[1].taken,40);assert.equal(restored.recap[1].endHp,0);assert.ok(validSave(restored));
 const hurt=createGame('BEFORE-HEAL');startBattle(hurt);activate(hurt,'i1');endTurn(hurt);activate(hurt,'i1');assert.equal(hurt.recap[0].endHp,35);assert.equal(hurt.hp,39);
});
test('reflection losses are capped at actual hp and can finish a recap',()=>{
 const s=createGame('REFLECT');s.floor=2;s.hp=1;startBattle(s);activate(s,'i1');
 assert.equal(s.phase,'lost');assert.equal(s.recap[0].taken,1);assert.equal(s.recap[0].dealt,9);assert.equal(s.recap[0].result,'lost');
});
test('legacy mid-battle saves start partial traces without inventing earlier numbers',()=>{
 const s=createGame('OLD',{version:1});startBattle(s);endTurn(s);delete s.recap;delete s.build;assert.ok(validSave(s));
 activate(s,'i1');assert.equal(s.recap[0].startHp,null);assert.equal(s.recap[0].taken,0);assert.equal(s.recap[0].dealt,9);
 const invalid=[null,[null],[{...s.recap[0],dealt:-1}],[s.recap[0],s.recap[0]]];for(const recap of invalid)assert.equal(validSave({...s,recap}),false);
});
test('only terminal runs archive once across refresh; snapshots preserve forged gear and remain isolated',()=>{
 const s=createGame('ARCHIVE');ensureRunId(s);assert.deepEqual(recordRun([],s),[]);winFirst(s);forge(s,'i1');skipReward(s);startBattle(s);while(s.phase==='battle')endTurn(s);
 const records=recordRun([],s,'2026-10-27T00:00:00.000Z');assert.equal(records.length,1);assert.equal(records[0].state.items[0].level,1);
 const loaded=readRecords(JSON.stringify(records));assert.equal(recordRun(loaded,JSON.parse(JSON.stringify(s))),loaded);
 s.items[0].level=2;assert.equal(records[0].state.items[0].level,1);assert.equal(loaded[0].endedAt,'2026-10-27T00:00:00.000Z');
});
test('archive retains fifty newest valid unique runs and safely ignores malformed entries',()=>{
 let records=[];for(let n=0;n<55;n++){const s=lose(createGame(`RUN-${n}`));s.runId=`id-${n}`;records=recordRun(records,s);}
 assert.equal(records.length,50);assert.equal(records[0].id,'id-54');assert.equal(records.at(-1).id,'id-5');
 assert.deepEqual(readRecords('broken'),[]);assert.deepEqual(readRecords('{}'),[]);
 const loaded=readRecords(JSON.stringify([null,{id:'bad'},records[0],records[0],{...records[1],endedAt:'bad'},records[2]]));assert.deepEqual(loaded.map(r=>r.id),['id-54','id-52']);
});
test('same-seed replay preserves build and rule version, not resources, upgrades or run identity',()=>{
 for(const config of [{version:1,build:'balanced'},{version:2,build:'archer'}]){
  const s=createGame('REPLAY',config);ensureRunId(s);const replay=replayConfig({state:s}),fresh=createGame(replay.seed,replay);ensureRunId(fresh);
  assert.equal(fresh.version,s.version);assert.equal(fresh.build,s.build);assert.deepEqual(fresh.items,s.items);assert.notEqual(fresh.runId,s.runId);assert.deepEqual(fresh.recap,[]);
  winFirst(s);winFirst(fresh);assert.deepEqual(fresh.rewards,s.rewards);assert.deepEqual(fresh.offers,s.offers);
 }
});

test('merging an older open tab retains records finished in another tab',()=>{
 const a=lose(createGame('TAB-A')),b=lose(createGame('TAB-B'));
 const older=recordRun([],a,'2026-10-27T00:00:00.000Z'),newer=recordRun(older,b,'2026-10-27T00:01:00.000Z');
 const merged=mergeRecords(older,newer);assert.equal(merged.length,2);assert.equal(merged[0].id,b.runId);assert.equal(merged[1].id,a.runId);assert.equal(recordRun(merged,a).length,2);
});
