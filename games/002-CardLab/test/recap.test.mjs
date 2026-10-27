import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSeededGame,play,discard,buyModule,sell,upgrade,reroll,nextStage,makeShop,validSave} from '../public/engine.js';
import {recordRun,validRecord} from '../public/records.js';
import {validRecap,logTransaction} from '../public/recap.js';

test('recap records scoring cards, discards, stage totals and both success/failure without changing seeded outcomes',()=>{
 const a=createSeededGame('RECAP'),b=createSeededGame('RECAP');delete b.recap;
 for(let i=0;i<4;i++){const ids=[a.hand[0].id];const pa=play(a,ids),pb=play(b,ids);assert.deepEqual(pa,pb);assert.deepEqual(a.hand,b.hand);if(a.phase!=='play')break;}
 assert.equal(a.phase,'lost');assert.equal(a.recap.partial,false);assert.equal(b.recap.partial,true);assert.equal(a.recap.stages[0].plays.length,4);assert.equal(a.recap.stages[0].score,a.score);assert.ok(validSave(a));
 const r=recordRun([],a)[0];assert.ok(validRecord(r));const score=r.recap.stages[0].score;a.recap.stages[0].score++;assert.equal(r.recap.stages[0].score,score);assert.equal(recordRun([r],a).length,1);
 const s=createSeededGame('PASS');discard(s,[s.hand[0].id]);s.score=10000;play(s,[s.hand[0].id]);assert.equal(s.phase,'shop');assert.equal(s.recap.stages[0].discards,1);assert.deepEqual(s.recap.stages[0].plays[0].cards,s.last.cards.map(c=>c.id));nextStage(s);play(s,[s.hand[0].id]);assert.equal(s.recap.stages.length,2);assert.ok(validRecap(s.recap));
});

test('all transaction types record exact cost, refunds and balance; rejected operations do not log',()=>{
 const s=createSeededGame('TRADES');s.phase='shop';s.money=30;makeShop(s);s.shop.modules[0]={id:'spark',bought:false};buyModule(s,0);assert.deepEqual(s.recap.stages[0].transactions[0],{type:'buy',moduleId:'spark',cost:4,refund:0,balance:26});
 const before=structuredClone(s);assert.throws(()=>buyModule(s,0));assert.deepEqual(s,before);
 s.shop.modules[1]={id:'echo',bought:false};buyModule(s,1,'spark');const replacement=s.recap.stages[0].transactions[1];assert.equal(replacement.type,'replace');assert.equal(replacement.refund,2);assert.equal(replacement.balance,20);
 sell(s,'echo');upgrade(s,0);reroll(s);const events=s.recap.stages[0].transactions;assert.deepEqual(events.map(t=>t.type),['buy','replace','sell','upgrade','reroll']);assert.equal(events.at(-1).cost,0);assert.equal(events.at(-1).balance,s.money);assert.ok(validSave(s));
 const restore=JSON.parse(JSON.stringify(s));nextStage(restore);assert.equal(restore.recap.stages[0].transactions.length,5);assert.ok(validSave(restore));
});

test('legacy saves remain loadable and begin partial recaps; invalid optional recap is rejected',()=>{
 const s=createSeededGame('LEGACY',{version:3});delete s.recap;assert.ok(validSave(s));discard(s,[s.hand[0].id]);assert.equal(s.recap.partial,true);assert.ok(validSave(s));
 assert.equal(validSave({...s,recap:{schema:1,partial:false,stages:[null]}}),false);
 const final={...s,phase:'lost'},r=recordRun([],final)[0];delete r.recap;assert.ok(validRecord(r));assert.equal(validRecord({...r,recap:{schema:99}}),false);
 assert.equal(validRecap({...s.recap,stages:[s.recap.stages[0],s.recap.stages[0]]}),false);
});

test('transaction retention is bounded and explicitly counts omitted entries',()=>{
 const s=createSeededGame('BOUND');for(let i=0;i<61;i++)logTransaction(s,{type:'reroll',cost:3,refund:0},150);
 const row=s.recap.stages[0];assert.equal(row.transactions.length,50);assert.equal(row.omitted,11);assert.ok(validSave(s));
});
