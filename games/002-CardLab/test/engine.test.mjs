import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HANDS,MODULES,TARGETS,evaluate,preview,createGame,play,discard,buyModule,upgrade,sell,reroll,nextStage,validSave} from '../public/engine.js';
const cards=spec=>spec.split(' ').map(s=>({id:s,suit:s[0],rank:+s.slice(1)}));
test('special stages preserve module triggers, enforce full opening atomically and penalize repeat types',()=>{
 const s=createGame();s.stage=2;s.modules=['red'];let p=preview(s,cards('H6 D6 S14'));assert.equal(p.cardChips,0);assert.equal(p.chips,10);assert.equal(p.mult,8);assert.equal(p.points,80);
 s.stage=5;s.hand=cards('H6 D6 S14 C3 S2 H4 D9 C10');s.deck=[];const before=structuredClone(s);assert.equal(preview(s,s.hand.slice(0,2)).blocked,true);assert.throws(()=>play(s,['H6','D6']));assert.deepEqual(s,before);discard(s,['C10']);assert.equal(s.played,0);assert.equal(preview(s,s.hand.slice(0,5)).blocked,false);
 s.stage=7;s.played=1;s.hands=3;s.usedHands=['pair'];s.modules=['spark','echo'];p=preview(s,cards('H6 D6'));assert.equal(p.penalty,0.5);assert.equal(p.points,99);assert.equal(preview(s,cards('H6')).penalty,1);
 s.version=1;assert.equal(preview(s,cards('H6 D6')).penalty,1);s.stage=5;assert.equal(preview(s,cards('H6')).blocked,false);
});
test('classic saves remain valid and new saves track hand types through stage transitions',()=>{
 const classic=createGame();classic.version=1;delete classic.usedHands;assert.ok(validSave(classic));play(classic,[classic.hand[0].id]);assert.ok(validSave(classic));
 const s=createGame();s.hand=cards('S14 S13 S12 S11 S10 H2 H3 H4');s.deck=[];play(s,s.hand.slice(0,5).map(c=>c.id));assert.deepEqual(s.usedHands,['straightFlush']);assert.equal(s.last.handChips,100);assert.equal(s.last.cardChips,51);assert.equal(s.last.cards.length,5);assert.ok(validSave(JSON.parse(JSON.stringify(s))));nextStage(s);assert.deepEqual(s.usedHands,[]);assert.ok(validSave(s));assert.equal(validSave({...s,usedHands:['pair']}),false);
});
test('all nine hand types and exact scoring cards',()=>{
 for(const [spec,id,count]of [['S14 H10 C8 D5 S2','high',1],['S2 H2 C8 D5 S14','pair',2],['S2 H2 C8 D8 S14','twoPair',4],['S2 H2 C2 D5 S14','three',3],['S14 H2 C3 D4 S5','straight',5],['S2 S4 S8 S10 S14','flush',5],['S2 H2 C2 D5 S5','house',5],['S2 H2 C2 D2 S14','four',4],['S10 S11 S12 S13 S14','straightFlush',5]]){const p=evaluate(cards(spec));assert.equal(p.hand.id,id);assert.equal(p.scoring.length,count);}
 assert.equal(evaluate(cards('S14 H2 C3 D4 S6')).hand.id,'high');assert.equal(evaluate(cards('S2 S3 S4 S5')).hand.id,'high');assert.throws(()=>evaluate(cards('S2 S2')));
});
test('preview applies scored-only effects, upgrades, and add-before-multiply',()=>{
 const s=createGame();let hand=cards('H2 D2 S14 S10 C8');s.modules=['red','even'];let p=preview(s,hand);assert.equal(p.chips,54);assert.equal(p.mult,8);assert.equal(p.points,432);
 s.levels.pair=2;p=preview(s,hand);assert.equal(p.chips,69);assert.equal(p.mult,9);
 s.modules=['anchor','spark','echo'];s.played=1;s.discards=0;p=preview(s,hand);assert.equal(p.mult,(3+4)*2*1.5);s.modules.reverse();assert.equal(preview(s,hand).points,p.points);
 s.modules=['odd'];assert.equal(preview(s,cards('S14')).chips,36);assert.equal(preview(s,cards('S11')).chips,15);
});
test('discard and play conserve uniqueness and prevent invalid actions',()=>{
 const s=createGame();assert.equal(new Set([...s.deck,...s.hand].map(c=>c.id)).size,52);assert.throws(()=>play(s,['bad']));const before=structuredClone(s);assert.throws(()=>discard(s,[]));assert.deepEqual(s,before);
 for(let i=0;i<3;i++)discard(s,s.hand.slice(0,5).map(c=>c.id));assert.equal(s.discards,0);assert.throws(()=>discard(s,[s.hand[0].id]));
 s.hand=cards('S14 S13 S12 S11 S10 H2 H3 H4');const p=preview(s,s.hand.slice(0,5));assert.equal(play(s,s.hand.slice(0,5).map(c=>c.id)).points,p.points);assert.equal(s.phase,'shop');assert.equal(s.money,15);assert.equal(s.hands,3);assert.ok(validSave(createGame()));
});
test('shop economy, capacity, upgrades and stage reset',()=>{
 const s=createGame();s.hand=cards('S14 S13 S12 S11 S10 H2 H3 H4');play(s,s.hand.slice(0,5).map(c=>c.id));s.money=100;
 const cost=MODULES.find(m=>m.id===s.shop.modules[0].id).price;buyModule(s,0);assert.equal(s.money,100-cost);assert.throws(()=>buyModule(s,0));const h=s.shop.upgrades[0].id;upgrade(s,0);assert.equal(s.levels[h],2);assert.throws(()=>upgrade(s,0));const id=s.modules[0];sell(s,id);assert.equal(s.modules.length,0);assert.throws(()=>sell(s,id));
 const money=s.money;reroll(s);assert.equal(s.money,money-3);assert.equal(s.shop.rerolls,1);nextStage(s);assert.equal(s.stage,1);assert.equal(s.hands,4);assert.equal(s.discards,3);assert.equal(s.score,0);assert.equal(s.levels[h],2);assert.ok(validSave(s));
 s.phase='shop';s.money=0;assert.throws(()=>reroll(s));s.modules=MODULES.slice(0,5).map(m=>m.id);s.money=100;assert.throws(()=>buyModule(s,0));
});
test('failure and eight-stage victory are terminal; restored shop is valid',()=>{
 const s=createGame();for(let i=0;i<4;i++){s.hand=cards('S2 H3 C4 D5 S7 H8 C9 D10');s.deck=[];play(s,['S2']);}assert.equal(s.phase,'lost');assert.throws(()=>play(s,['H3']));assert.ok(validSave(s));
 const w=createGame();w.modules=['spark','pair','red','even','echo'];w.levels.straightFlush=5;
 for(let i=0;i<8;i++){w.hand=cards('S10 S11 S12 S13 S14 H2 H3 H4');w.deck=[];w.score=TARGETS[i]-1;play(w,w.hand.slice(0,5).map(c=>c.id));assert.equal(w.phase,i===7?'won':'shop');assert.ok(validSave(JSON.parse(JSON.stringify(w))));if(i<7)nextStage(w);}
 assert.equal(w.history.length,8);assert.throws(()=>nextStage(w));assert.equal(validSave({...w,stage:9}),false);assert.equal(validSave({...w,modules:['unknown']}),false);
});
test('real shuffled runs retain valid saves and unique deck/hand cards',()=>{
 let seed=319;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let run=0;run<12;run++){
  const s=createGame(rng);let actions=0;
  while(s.phase!=='won'&&s.phase!=='lost'){
   assert.ok(actions++<80);assert.ok(validSave(JSON.parse(JSON.stringify(s))));
   if(s.phase==='shop'){for(let i=0;i<3;i++){const m=MODULES.find(m=>m.id===s.shop.modules[i].id);if(s.money>=m.price&&s.modules.length<5)buyModule(s,i);}nextStage(s,rng);continue;}
   let best=null;
   for(let mask=1;mask<(1<<s.hand.length);mask++){const c=s.hand.filter((_,i)=>(mask>>i)&1);if(c.length>5)continue;const p=preview(s,c);if(p.blocked)continue;if(!best||p.points>best.points)best={points:p.points,ids:c.map(c=>c.id)};}
   play(s,best.ids,rng);
  }
  assert.ok(validSave(s));
 }
});
