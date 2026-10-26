import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSeededGame,DECKS,DIFFICULTIES,TARGETS,targetFor,preview,play,discard,makeShop,reroll,nextStage,validSave} from '../public/engine.js';
import {recordRun,validRecord} from '../public/records.js';
test('all nine configurations have valid unique decks, difficulty targets and reproducible shop/deck streams',()=>{
 for(const deckProfile of Object.keys(DECKS))for(const difficulty of Object.keys(DIFFICULTIES)){
  const options={deckProfile,difficulty},a=createSeededGame('CONFIG-TEST',options),b=createSeededGame('CONFIG-TEST',options);assert.equal(a.version,5);assert.ok(validSave(a));assert.equal(a.hand.length+a.deck.length,DECKS[deckProfile].size);assert.equal(new Set([...a.hand,...a.deck].map(c=>c.id)).size,DECKS[deckProfile].size);assert.equal(a.discards,DECKS[deckProfile].discards);assert.ok([...a.hand,...a.deck].every(c=>DECKS[deckProfile].ranks.includes(c.rank)));assert.deepEqual(a.hand,b.hand);
  for(let stage=0;stage<8;stage++)assert.equal(targetFor({...a,stage}),Math.round(TARGETS[stage]*DIFFICULTIES[difficulty].scale));
  for(const s of [a,b]){s.phase='shop';s.money=40;makeShop(s);reroll(s);}assert.deepEqual(a.shop,b.shop);const clone=JSON.parse(JSON.stringify(a));reroll(a);reroll(clone);assert.deepEqual(a.shop,clone.shop);nextStage(a);nextStage(clone);assert.deepEqual(a.deck,clone.deck);assert.ok(validSave(a));
 }
});
test('numeric deck can exhaust every allowed five-card discard/play without running short; useless module stays out of shop',()=>{
 const s=createSeededGame('NUMERIC',{deckProfile:'numeric',difficulty:'expert'});for(let i=0;i<2;i++)discard(s,s.hand.slice(0,5).map(c=>c.id));assert.throws(()=>discard(s,[s.hand[0].id]));
 // Keep this test in play to exercise the maximum resource budget, without adding fake cards.
 for(let i=0;i<4;i++){s.stage=7;const ids=s.hand.slice(0,5).map(c=>c.id);assert.equal(ids.length,5);play(s,ids);if(s.phase==='shop')s.phase='play';}
 assert.equal(s.hand.length,8);assert.equal(s.deck.length,2);assert.ok(validSave(s));
 s.phase='shop';s.money=100;makeShop(s);for(let i=0;i<15;i++){assert.ok(s.shop.modules.every(o=>o.id!=='face'));reroll(s);}
});
test('v3 seed replay keeps original starting cards and ignores difficulty multipliers',()=>{
 const s=createSeededGame('CARDLAB-001',{version:3});assert.equal(s.version,3);assert.deepEqual(s.hand.map(c=>c.id).sort(),['D14','C12','C10','C9','S9','C7','S6','H4'].sort());assert.equal(targetFor(s),150);assert.equal(s.discards,3);assert.ok(validSave(s));assert.throws(()=>createSeededGame('X',{version:3,deckProfile:'numeric'}));
});
test('difficulty controls actual pass/fail threshold; record and replay preserve original settings',()=>{
 const s=createSeededGame('THRESHOLD',{difficulty:'relaxed',deckProfile:'trimmed'});const cards=s.hand.slice(0,5);const p=preview(s,cards);s.score=targetFor(s)-p.points;play(s,cards.map(c=>c.id));assert.equal(s.phase,'shop');assert.equal(s.history[0].target,120);assert.ok(s.score<150);
 const final={...s,phase:'lost'},r=recordRun([],final)[0];assert.ok(validRecord(r));assert.equal(r.deckProfile,'trimmed');assert.equal(r.difficulty,'relaxed');const replay=createSeededGame(r.seed,r);assert.equal(replay.difficulty,s.difficulty);assert.equal(replay.deckProfile,s.deckProfile);assert.deepEqual(replay.hand,createSeededGame('THRESHOLD',{difficulty:'relaxed',deckProfile:'trimmed'}).hand);
 assert.equal(validSave({...s,deckProfile:'invalid'}),false);assert.equal(validRecord({...r,difficulty:'invalid'}),false);assert.throws(()=>createSeededGame('X',{difficulty:'invalid'}));
});
