import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,buildAdvice,combatSlots,stash,place,rotate,startBattle,activate,effects} from '../public/engine.js';
test('advice is read-only and only counts equipped edge-adjacent support targets',()=>{
 const s=createGame('ADVICE'),before=structuredClone(s),a=buildAdvice(s);assert.deepEqual(s,before);assert.deepEqual(a.issues,[]);assert.deepEqual(a.links,[{uid:'i3',targets:['i1']}]);assert.equal(effects(s,s.items[0]).damage,9);
 stash(s,'i1');assert.ok(buildAdvice(s).issues.some(o=>o.code==='no-weapon'));assert.ok(buildAdvice(s).issues.some(o=>o.code==='idle-stone'));
 stash(s,'i3');assert.ok(!buildAdvice(s).issues.some(o=>o.uid==='i3'));place(s,'i1',0,0);place(s,'i3',2,1);assert.ok(buildAdvice(s).issues.some(o=>o.code==='idle-stone'));assert.equal(effects(s,s.items[0]).damage,6);
});
test('archery advice matches actual quiver and edge bonuses, including rotation',()=>{
 const s=createGame('ARCHERY',{build:'archer'});assert.deepEqual(buildAdvice(s).issues,[]);assert.equal(effects(s,s.items[0]).damage,15);
 stash(s,'i1');rotate(s,'i1');place(s,'i1',1,0);const issues=buildAdvice(s).issues;assert.ok(issues.some(o=>o.code==='bow-edge'));assert.ok(issues.some(o=>o.code==='idle-quiver'));assert.equal(effects(s,s.items[0]).damage,7);
 stash(s,'i3');assert.ok(!buildAdvice(s).issues.some(o=>o.code==='idle-quiver'));
});
test('kit notices lost adjacency after real consumable use and capacity is reported without mutation',()=>{
 const s=createGame('KIT',{build:'alchemist'});assert.ok(!buildAdvice(s).issues.some(o=>o.code==='idle-kit'));startBattle(s);activate(s,'i4');activate(s,'i5');assert.ok(buildAdvice(s).issues.some(o=>o.code==='idle-kit'));
 while(s.items.length<12)s.items.push({uid:`i${s.nextId++}`,type:'herb',x:null,y:null,rotation:0});const before=structuredClone(s);assert.ok(buildAdvice(s).issues.some(o=>o.code==='capacity'));assert.deepEqual(s,before);
});
test('combat keys follow spatial order and stay stable when consumables disappear',()=>{
 const s=createGame('KEYS',{build:'alchemist'}),before=structuredClone(s),slots=combatSlots(s);assert.deepEqual(s,before);assert.deepEqual(slots,[{uid:'i1',key:'1'},{uid:'i2',key:'2'}]);startBattle(s);activate(s,'i4');activate(s,'i5');assert.deepEqual(combatSlots(s),slots);
 const b=createGame('GUARD',{build:'bulwark'});assert.deepEqual(combatSlots(b).map(o=>o.uid),['i1','i3','i2']);stash(b,'i1');assert.deepEqual(combatSlots(b).map(o=>o.uid),['i3','i2']);
 const many=createGame('NINE');many.items=Array.from({length:10},(_,n)=>({uid:`i${n+1}`,type:'dagger',x:n%5,y:Math.floor(n/5),rotation:0}));many.nextId=11;assert.equal(combatSlots(many).length,9);assert.equal(combatSlots(many).at(-1).key,'9');
});
