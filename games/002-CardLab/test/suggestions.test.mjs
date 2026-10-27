import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSeededGame,preview,play,suggestHands} from '../public/engine.js';
const cards=text=>text.split(' ').map(id=>({id,suit:id[0],rank:Number(id.slice(1))}));

test('suggestions find the actual best immediate score and return distinct playable hand types',()=>{
 for(const seed of ['HELP-1','HELP-2','HELP-3']){
  const s=createSeededGame(seed);s.modules=['red','small','echo','wallet'];s.money=15;
  const before=structuredClone(s),options=suggestHands(s);assert.deepEqual(s,before);assert.ok(options.length>=1&&options.length<=3);assert.equal(new Set(options.map(o=>o.result.hand.id)).size,options.length);
  let maximum=0;
  function visit(index,selected){if(selected.length){const p=preview(s,selected);if(!p.blocked)maximum=Math.max(maximum,p.points);}if(selected.length===5)return;for(let i=index;i<s.hand.length;i++)visit(i+1,[...selected,s.hand[i]]);}
  visit(0,[]);assert.equal(options[0].result.points,maximum);
  for(const option of options){const restored=structuredClone(s),actual=play(restored,option.ids);assert.equal(actual.points,option.result.points);assert.equal(actual.hand.id,option.result.hand.id);}
  assert.deepEqual(suggestHands({...s,hand:[...s.hand].reverse()}),options);
 }
});

test('full opening only suggests five-card plays; later ties prefer fewer cards',()=>{
 const s=createSeededGame('OPEN');s.hand=cards('S2 H4 C6 D8 S10 H11 C12 D14');s.stage=5;
 const options=suggestHands(s);assert.ok(options.length);assert.ok(options.every(o=>o.ids.length===5&&!o.result.blocked));
 s.played=1;s.hands=3;assert.equal(suggestHands(s)[0].ids.length,1);
 assert.deepEqual(suggestHands({...s,played:0,hand:s.hand.slice(0,4)}),[]);
});

test('advice accounts for repeat-type penalties, zeroed red cards and current modules',()=>{
 const s=createSeededGame('RULES');s.hand=cards('S2 S4 S6 S8 S10 H10 D10 C10');s.stage=7;s.modules=['flush'];
 assert.equal(suggestHands(s)[0].result.hand.id,'four');s.usedHands=['four'];s.played=1;s.hands=3;
 const top=suggestHands(s)[0];assert.equal(top.result.hand.id,'flush');assert.equal(top.result.points,660);
 s.stage=2;s.hand=cards('H2 H4 H6 H8 H10 S3 C7 D14');s.modules=['red','flush'];const redFlush=suggestHands(s,9).find(o=>o.result.hand.id==='flush');assert.equal(redFlush.result.cardChips,0);assert.equal(redFlush.result.points,2565);
});

test('advice never reads the hidden deck/shop, consumes randomness, or changes progress',()=>{
 const s=createSeededGame('VISIBLE');Object.defineProperty(s,'deck',{get(){throw Error('hidden deck read');}});Object.defineProperty(s,'shop',{get(){throw Error('shop read');}});
 const random=Math.random;try{Math.random=()=>{throw Error('randomness consumed');};assert.ok(suggestHands(s).length);}finally{Math.random=random;}
 for(const phase of ['shop','won','lost'])assert.deepEqual(suggestHands({...createSeededGame('END'),phase}),[]);
 assert.deepEqual(suggestHands({...createSeededGame('EMPTY'),hands:0}),[]);assert.deepEqual(suggestHands(createSeededGame('LIMIT'),0),[]);
});
