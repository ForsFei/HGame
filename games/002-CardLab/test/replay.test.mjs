import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSeededGame,createGame,play,discard,preview,makeShop,reroll,nextStage,validSave} from '../public/engine.js';
import {recordRun,validRecord} from '../public/records.js';
test('seed normalization reproduces all deck/shop choices and survives JSON restore',()=>{
 const a=createSeededGame(' test-001 '),b=createSeededGame('TEST-001');assert.equal(a.seed,b.seed);assert.deepEqual(a.hand,b.hand);assert.deepEqual(a.deck,b.deck);assert.notDeepEqual(a.hand,createSeededGame('OTHER').hand);
 for(const s of [a,b]){discard(s,s.hand.slice(0,3).map(c=>c.id));s.phase='shop';s.money=30;makeShop(s);}assert.deepEqual(a.shop,b.shop);
 const restored=JSON.parse(JSON.stringify(a));reroll(a);reroll(restored);assert.deepEqual(a.shop,restored.shop);nextStage(a);nextStage(restored);assert.deepEqual(a.hand,restored.hand);assert.ok(validSave(restored));assert.throws(()=>createSeededGame('<script>'));
});
test('shop refresh does not change the next-stage deck and seeded saves validate metadata',()=>{
 const a=createSeededGame('CHANNELS'),b=createSeededGame('CHANNELS');for(const s of [a,b]){s.phase='shop';s.money=30;makeShop(s);}reroll(a);nextStage(a);nextStage(b);assert.deepEqual(a.deck,b.deck);assert.ok(validSave(a));assert.equal(validSave({...a,seed:'bad space'}),false);assert.equal(validSave({...a,shopGeneration:-1}),false);
});
test('new balance changes only v3; legacy runs keep original module values',()=>{
 const s=createSeededGame('BALANCE'),old=createGame();const c=[{id:'S2',rank:2,suit:'S'}];s.modules=old.modules=['small'];assert.equal(preview(s,c).mult,7);assert.equal(preview(old,c).mult,11);
 const flush=[2,4,6,8,10].map(rank=>({id:`S${rank}`,rank,suit:'S'}));s.modules=old.modules=['flush'];assert.equal(preview(s,flush).chips-preview(old,flush).chips,20);
});
test('finished runs are recorded once, replay attempts have distinct IDs, records capped at 50',()=>{
 const s=createSeededGame('RECORD');assert.deepEqual(recordRun([],s),[]);s.phase='lost';s.score=60;s.bestHand=40;s.history=[{score:200}];const list=recordRun([],s);assert.equal(list[0].total,260);assert.equal(list[0].bestHand,40);assert.ok(validRecord(list[0]));assert.equal(recordRun(list,s).length,1);const other=createSeededGame('RECORD');other.phase='won';other.history=[{score:300}];assert.equal(recordRun(list,other).length,2);
 let many=[];for(let i=0;i<60;i++)many=recordRun(many,{...s,runId:`run${i}`});assert.equal(many.length,50);assert.equal(many[0].id,'run59');assert.equal(validRecord({...many[0],total:NaN}),false);
});
