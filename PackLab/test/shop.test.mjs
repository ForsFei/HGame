import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,createGame,startBattle,activate,endTurn,skipReward,buy,shopRefreshPreview,refreshShop,validSave} from '../public/engine.js';
function fight(s){startBattle(s);for(let n=0;n<30&&s.phase==='battle';n++){activate(s,'i1');if(s.phase==='battle'){activate(s,'i2');endTurn(s);}}assert.equal(s.phase,'camp');}
function camp(seed='SHOP',version=2){const s=createGame(seed,{version});fight(s);return s;}
test('refresh preview is read-only; payment replaces all offers with distinct new stock',()=>{
 for(let n=0;n<20;n++){
  const s=camp(`SHOP-${n}`),before=structuredClone(s),p=shopRefreshPreview(s);
  assert.deepEqual(s,before);assert.equal(p.cost,3);assert.equal(p.balanceAfter,8);assert.equal(p.canRefresh,true);
  refreshShop(s);assert.equal(s.gold,8);assert.equal(s.shopRefreshes,1);assert.equal(s.offers.length,3);assert.equal(new Set(s.offers.map(o=>o.type)).size,3);
  assert.ok(s.offers.every(o=>!o.bought&&!before.offers.some(old=>old.type===o.type)));assert.deepEqual(s.rewards,before.rewards);assert.deepEqual(s.items,before.items);assert.equal(s.hp,before.hp);assert.equal(s.log[0].type,'refresh');assert.ok(validSave(s));
 }
});
test('refresh preserves purchased inventory and reward handling; fresh offers can be bought once',()=>{
 const s=camp('BUY-REFRESH');skipReward(s);const purchased=s.offers[0].type,id=buy(s,0),gold=s.gold,items=structuredClone(s.items);
 assert.ok(gold>=3);refreshShop(s);assert.equal(s.gold,gold-3);assert.deepEqual(s.items,items);assert.equal(s.items.find(i=>i.uid===id).type,purchased);assert.equal(s.rewardTaken,true);
 // Sell-free purchasing check with enough earned resources isolated from the refresh operation.
 s.gold=30;const cost=ITEMS[s.offers[0].type].price,uid=buy(s,0);assert.equal(s.gold,30-cost);assert.ok(s.items.some(i=>i.uid===uid));const before=structuredClone(s);assert.throws(()=>buy(s,0));assert.deepEqual(s,before);
});
test('refresh is reproducible after JSON restore and does not perturb later original camp stock',()=>{
 const a=camp('STREAM'),b=JSON.parse(JSON.stringify(a)),control=structuredClone(a);
 refreshShop(a);refreshShop(b);assert.deepEqual(a,b);
 const saved=JSON.parse(JSON.stringify(a));assert.ok(validSave(saved));assert.equal(shopRefreshPreview(saved).reason,'used');const before=structuredClone(saved);assert.throws(()=>refreshShop(saved));assert.deepEqual(saved,before);
 skipReward(saved);skipReward(control);fight(saved);fight(control);assert.equal(saved.shopRefreshes,0);assert.equal(shopRefreshPreview(saved).canRefresh,true);assert.deepEqual(saved.offers,control.offers);assert.deepEqual(saved.rewards,control.rewards);refreshShop(saved);assert.ok(validSave(saved));
});
test('classic, wrong phase, insufficient funds and repeated refreshes fail atomically',()=>{
 const poor=camp();poor.gold=2;
 const used=camp();refreshShop(used);
 const battle=createGame('BATTLE');startBattle(battle);
 for(const [s,reason]of [[camp('CLASSIC',1),'classic'],[createGame('PREP'),'camp'],[battle,'camp'],[poor,'funds'],[used,'used']]){
  const before=structuredClone(s);assert.equal(shopRefreshPreview(s).reason,reason);assert.throws(()=>refreshShop(s));assert.deepEqual(s,before);
 }
});
test('old saves default to an unused refresh; malformed counters and logs are rejected',()=>{
 const s=camp('OLD');delete s.shopRefreshes;assert.ok(validSave(s));assert.equal(shopRefreshPreview(s).used,0);refreshShop(s);assert.ok(validSave(s));
 for(const value of [null,-1,2,'1',true])assert.equal(validSave({...s,shopRefreshes:value}),false);
 assert.equal(validSave({...s,log:[{type:'refresh',cost:0}]}),false);assert.equal(validSave({...createGame('CLASSIC',{version:1}),shopRefreshes:1}),false);
 assert.equal(validSave({...createGame('PREP'),shopRefreshes:1}),false);
 const old=camp('LEGACY',1);delete old.shopRefreshes;assert.ok(validSave(old));assert.equal(shopRefreshPreview(old).reason,'classic');
});
