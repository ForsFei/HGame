import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startBattle,activate,endTurn,skipReward,forgePreview,forge,itemLevel,resaleValue,effects,sell,validSave,createLayoutHistory,editLayout,undoLayout,redoLayout} from '../public/engine.js';
function camp(build='balanced',version=2){const s=createGame('FORGE',{build,version});startBattle(s);if(build==='bulwark'){activate(s,'i2');activate(s,'i3');endTurn(s);activate(s,'i2');activate(s,'i3');}else{activate(s,'i1');activate(s,'i2');endTurn(s);activate(s,'i1');}assert.equal(s.phase,'camp');return s;}

test('forge preview is pure; two levels charge 5/8, persist and stop at the cap',()=>{
 const s=camp(),before=structuredClone(s),p=forgePreview(s,'i1');assert.deepEqual(s,before);assert.equal(p.cost,5);assert.equal(p.before,9);assert.equal(p.after,12);assert.equal(p.nextResale,5);
 skipReward(s);assert.equal(s.gold,14);forge(s,'i1');assert.equal(s.gold,9);assert.equal(itemLevel(s.items[0]),1);assert.equal(effects(s,s.items[0]).damage,12);forge(s,'i1');assert.equal(s.gold,1);assert.equal(effects(s,s.items[0]).damage,15);assert.equal(resaleValue(s.items[0]),9);assert.ok(validSave(s));
 const restored=JSON.parse(JSON.stringify(s));assert.ok(validSave(restored));assert.equal(itemLevel(restored.items[0]),2);const capped=structuredClone(restored);assert.throws(()=>forge(restored,'i1'));assert.deepEqual(restored,capped);assert.equal(forgePreview(restored,'i1').reason,'max');
 startBattle(restored);assert.equal(activate(restored,'i1').damage,15);assert.equal(restored.enemy.hp,11);
});

test('insufficient funds, wrong phase, unsupported items and classic saves reject atomically',()=>{
 const s=camp();forge(s,'i1');const insufficient=structuredClone(s);assert.equal(forgePreview(s,'i1').reason,'funds');assert.throws(()=>forge(s,'i1'));assert.deepEqual(s,insufficient);
 for(const uid of ['i3','i4']){const before=structuredClone(s);assert.equal(forgePreview(s,uid).reason,'unsupported');assert.throws(()=>forge(s,uid));assert.deepEqual(s,before);}
 const prepare=createGame('PREP'),before=structuredClone(prepare);assert.equal(forgePreview(prepare,'i1').reason,'camp');assert.throws(()=>forge(prepare,'i1'));assert.deepEqual(prepare,before);
 startBattle(prepare);const battle=structuredClone(prepare);assert.throws(()=>forge(prepare,'i1'));assert.deepEqual(prepare,battle);
 const classic=camp('balanced',1),old=structuredClone(classic);assert.equal(forgePreview(classic,'i1').reason,'classic');assert.throws(()=>forge(classic,'i1'));assert.deepEqual(classic,old);assert.ok(validSave(classic));
});

test('upgraded guards keep their shape/cost and strengthen feedback damage in real combat',()=>{
 const s=camp('bulwark'),geometry=s.items.map(i=>[i.uid,i.type,i.x,i.y,i.rotation]);forge(s,'i2');assert.equal(effects(s,s.items[1]).block,17);assert.deepEqual(s.items.map(i=>[i.uid,i.type,i.x,i.y,i.rotation]),geometry);skipReward(s);startBattle(s);activate(s,'i2');assert.equal(s.energy,1);assert.equal(s.block,17);assert.equal(effects(s,s.items[2]).damage,11);activate(s,'i3');assert.equal(s.enemy.hp,15);assert.ok(validSave(s));
});

test('layout undo preserves paid levels and gold; resale includes invested cost without restoring sold items',()=>{
 const s=camp(),h=createLayoutHistory(s);editLayout(s,h,'stash','i1');forge(s,'i1');assert.equal(s.gold,6);undoLayout(s,h);assert.equal(s.items[0].x,0);assert.equal(itemLevel(s.items[0]),1);assert.equal(s.gold,6);redoLayout(s,h);assert.equal(s.items[0].x,null);assert.equal(itemLevel(s.items[0]),1);assert.ok(validSave(s));
 s.items.push({uid:`i${s.nextId++}`,type:'blade',x:null,y:null,rotation:0});const rewardTaken=s.rewardTaken;sell(s,'i1');assert.equal(s.gold,11);assert.ok(!s.items.some(i=>i.uid==='i1'));assert.equal(s.rewardTaken,rewardTaken);const sold=structuredClone(s);assert.throws(()=>undoLayout(s,h));assert.deepEqual(s,sold);
});

test('optional upgrade data stays backward compatible but rejects invalid levels and forge logs',()=>{
 const s=createGame('VALID');assert.ok(validSave(s));
 for(const level of [-1,0.5,3,'1',null]){const changed=structuredClone(s);changed.items[0].level=level;assert.equal(validSave(changed),false,String(level));}
 for(const uid of ['i3','i4']){const changed=structuredClone(s);changed.items.find(i=>i.uid===uid).level=1;assert.equal(validSave(changed),false);}
 const classic=createGame('OLD',{version:1});classic.items[0].level=1;assert.equal(validSave(classic),false);
 const forged=camp();forge(forged,'i1');forged.log[0].cost=0;assert.equal(validSave(forged),false);
});
