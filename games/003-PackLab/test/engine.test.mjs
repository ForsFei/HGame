import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,shape,cellsFor,neighbours,effects,createGame,place,stash,rotate,autoPlace,startBattle,activate,endTurn,takeReward,skipReward,buy,sell,rest,validSave} from '../public/engine.js';
const extra=(s,type,x=null,y=null)=>{const i={uid:`i${s.nextId++}`,type,x,y,rotation:0};s.items.push(i);return i;};
const winFirst=s=>{startBattle(s);activate(s,'i1');activate(s,'i2');endTurn(s);activate(s,'i1');assert.equal(s.phase,'camp');};

test('shape rotation preserves area; invalid placement and rotation are atomic',()=>{
 const s=createGame('GRID');assert.ok(validSave(s));
 for(const [type,def]of Object.entries(ITEMS))for(let r=0;r<4;r++){const cells=shape(type,r);assert.equal(cells.length,def.shape.length);assert.equal(new Set(cells.map(p=>p.join(','))).size,cells.length);assert.equal(Math.min(...cells.map(p=>p[0])),0);assert.equal(Math.min(...cells.map(p=>p[1])),0);}
 extra(s,'stone',0,1);const before=structuredClone(s);assert.throws(()=>place(s,'i1',3,0));assert.deepEqual(s,before);assert.throws(()=>place(s,'i1',4,3));assert.deepEqual(s,before);assert.throws(()=>rotate(s,'i1'));assert.deepEqual(s,before);
 stash(s,'i1');rotate(s,'i1');autoPlace(s,'i1');assert.ok(validSave(s));assert.equal(cellsFor(s.items[0]).length,2);
});
test('adjacency counts objects once, ignores diagonals and stash',()=>{
 const s=createGame('ADJ');assert.equal(effects(s,s.items[0]).damage,9);assert.equal(neighbours(s,s.items[0]).filter(i=>i.type==='stone').length,1);
 stash(s,'i3');assert.equal(effects(s,s.items[0]).damage,6);place(s,'i3',2,1);assert.equal(effects(s,s.items[0]).damage,6);
 s.items=[];const hammer=extra(s,'hammer',0,0);extra(s,'stone',2,0);const dagger=extra(s,'dagger',2,1);assert.equal(effects(s,hammer).damage,24);assert.equal(effects(s,dagger).damage,9);assert.ok(validSave(s));
 const armor=extra(s,'armor',3,0),shield=extra(s,'shield',3,2);assert.equal(effects(s,shield).block,9);assert.equal(neighbours(s,shield).filter(i=>i.uid===armor.uid).length,1);
});
test('combat spends energy, locks layout, limits usage and resets shields',()=>{
 const s=createGame('FIGHT');startBattle(s);activate(s,'i1');assert.equal(s.enemy.hp,9);assert.equal(s.energy,2);
 const before=structuredClone(s);assert.throws(()=>activate(s,'i1'));assert.throws(()=>stash(s,'i1'));assert.throws(()=>rotate(s,'i2'));assert.deepEqual(s,before);
 activate(s,'i2');endTurn(s);assert.equal(s.hp,40);assert.equal(s.block,0);assert.equal(s.energy,3);assert.deepEqual(s.used,[]);activate(s,'i1');assert.equal(s.phase,'camp');assert.ok(validSave(s));
});
test('consumables heal and extend budget once; enemy guard absorbs damage',()=>{
 const s=createGame('CONSUME');extra(s,'flask',4,0);startBattle(s);s.hp=35;activate(s,'i4');assert.equal(s.hp,40);assert.ok(!s.items.some(i=>i.uid==='i4'));assert.equal(s.log[0].heal,5);activate(s,'i5');assert.equal(s.energy,5);assert.ok(!s.items.some(i=>i.uid==='i5'));assert.ok(validSave(s));
 s.floor=1;s.enemy={hp:26,block:0,intentIndex:0};endTurn(s);assert.equal(s.enemy.block,6);activate(s,'i1');assert.equal(s.enemy.hp,23);assert.equal(s.enemy.block,0);endTurn(s);assert.equal(s.hp,32);assert.ok(validSave(s));
});
test('camp economy, rewards, capacity and deterministic loot survive restore',()=>{
 const a=createGame('LOOT'),b=createGame('LOOT');winFirst(a);winFirst(b);assert.deepEqual(a.rewards,b.rewards);assert.deepEqual(a.offers,b.offers);assert.equal(a.gold,11);
 const before=structuredClone(a);assert.throws(()=>startBattle(a));assert.deepEqual(a,before);const uid=takeReward(a,0);assert.equal(a.items.find(i=>i.uid===uid).x,null);assert.throws(()=>takeReward(a,1));assert.throws(()=>skipReward(a));
 a.gold=30;buy(a,0);const money=a.gold;assert.throws(()=>buy(a,0));assert.equal(a.gold,money);a.hp=20;rest(a);assert.equal(a.hp,30);assert.throws(()=>rest(a));sell(a,uid);
 const restored=JSON.parse(JSON.stringify(a));assert.ok(validSave(restored));startBattle(restored);assert.equal(restored.floor,1);assert.ok(validSave(restored));
 while(b.items.length<12)extra(b,'stone');const full=structuredClone(b);assert.throws(()=>takeReward(b,0));assert.deepEqual(b,full);skipReward(b);assert.equal(b.gold,14);assert.ok(validSave(b));
});
test('defeat/victory terminate actions and passives apply',()=>{
 const s=createGame('LOSE');startBattle(s);s.hp=1;endTurn(s);assert.equal(s.phase,'lost');assert.ok(validSave(s));const before=structuredClone(s);assert.throws(()=>activate(s,'i1'));assert.throws(()=>endTurn(s));assert.deepEqual(s,before);
 const w=createGame('WIN');w.floor=7;w.phase='battle';w.turn=1;w.energy=3;w.enemy={hp:1,block:0,intentIndex:0};extra(w,'pouch',0,2);activate(w,'i1');assert.equal(w.phase,'won');assert.equal(w.gold,21);assert.ok(validSave(w));assert.throws(()=>startBattle(w));
 const p=createGame('ARMOR');extra(p,'armor',0,2);startBattle(p);assert.equal(p.block,4);activate(p,'i2');assert.equal(p.block,11);
});
test('validation rejects malformed data, overlap and impossible states',()=>{
 const s=createGame('SAVE');assert.ok(validSave(s));assert.throws(()=>createGame('bad seed!'));
 for(const change of [{items:[null]},{items:[{...s.items[0],type:'bad'},s.items[1]]},{hp:41},{floor:8},{phase:'camp'},{used:null}])assert.equal(validSave({...s,...change}),false);
 const collision=structuredClone(s);collision.items[1].x=0;assert.equal(validSave(collision),false);assert.equal(validSave({...s,phase:'lost'}),false);
 assert.throws(()=>sell(s,'i1'));for(const i of s.items)stash(s,i.uid);assert.throws(()=>startBattle(s));
});
