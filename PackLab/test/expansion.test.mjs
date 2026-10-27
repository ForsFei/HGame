import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BUILDS,createGame,startBattle,activate,endTurn,effects,combatPreview,enemyTrait,intent,validSave,stash,previewPlacement} from '../public/engine.js';
const add=(s,type,x,y)=>{const i={uid:`i${s.nextId++}`,type,x,y,rotation:0};s.items.push(i);return i;};

test('four v2 loadouts have valid non-overlapping inventories and deterministic starts',()=>{
 for(const build of Object.keys(BUILDS)){const a=createGame('BUILD',{build}),b=createGame('BUILD',{build});assert.equal(a.version,2);assert.ok(validSave(a),build);assert.deepEqual(a.items,b.items);startBattle(a);assert.ok(validSave(a));}
 assert.throws(()=>createGame('BAD',{build:'unknown'}));assert.throws(()=>createGame('OLD',{version:1,build:'archer'}));
});
test('legacy saves keep original pool and enemy rules; v2 rewards always offer one consumable',()=>{
 const old=createGame('LEGACY',{version:1});delete old.build;assert.ok(validSave(old));startBattle(old);activate(old,'i1');activate(old,'i2');endTurn(old);activate(old,'i1');
 assert.deepEqual(old.rewards,['spark','armor','pouch']);assert.deepEqual(old.offers.map(o=>o.type),['stone','spark','herb']);assert.equal(enemyTrait({...old,floor:2}),null);
 for(let n=0;n<8;n++){const s=createGame(`SUPPLY-${n}`);startBattle(s);activate(s,'i1');activate(s,'i2');endTurn(s);activate(s,'i1');assert.ok(['herb','flask','bomb'].includes(s.rewards[0]));assert.equal(new Set(s.rewards).size,3);assert.ok(validSave(s));}
 assert.equal(validSave({...old,items:[null]}),false);
});
test('archery adjacency stacks by object and piercing bypasses armor without consuming it',()=>{
 const s=createGame('ARCHER',{build:'archer'});assert.equal(effects(s,s.items[0]).damage,15);
 const crossbow=add(s,'crossbow',1,1);assert.equal(effects(s,crossbow).damage,20);s.floor=2;startBattle(s);s.enemy.block=8;
 const before=structuredClone(s),p=combatPreview(s,crossbow.uid);assert.deepEqual(s,before);assert.equal(p.damageDealt,20);assert.equal(p.retaliation,0);activate(s,crossbow.uid);assert.equal(s.enemy.block,8);assert.equal(s.hp,40);assert.equal(s.enemy.hp,14);assert.ok(validSave(s));
});
test('heavy build rewards guard-before-bash and caps the dynamic damage bonus',()=>{
 const s=createGame('HEAVY',{build:'bulwark'});startBattle(s);assert.equal(effects(s,s.items[2]).damage,3);activate(s,'i2');assert.equal(s.block,14);assert.equal(effects(s,s.items[2]).damage,10);activate(s,'i3');assert.equal(s.enemy.hp,8);assert.equal(s.block,14);assert.equal(s.energy,0);
 s.block=100;assert.equal(effects(s,s.items[2]).damage,15);
});
test('consumable kit provides adjacent healing and block, and preview shows loss when moved',()=>{
 const s=createGame('ALCHEMY',{build:'alchemist'});s.floor=2;startBattle(s);s.hp=20;s.enemy.block=5;
 const p=combatPreview(s,'i5');assert.equal(p.damageDealt,7);assert.equal(p.healed,3);assert.equal(p.block,3);assert.equal(p.retaliation,0);activate(s,'i5');assert.equal(s.hp,23);assert.equal(s.block,3);assert.ok(!s.items.some(i=>i.uid==='i5'));assert.ok(validSave(s));
 const layout=createGame('MOVE',{build:'alchemist'}),preview=previewPlacement(layout,'i3',2,3);assert.ok(preview.changes.some(c=>c.uid==='i4'&&c.stat==='heal'&&c.before===13&&c.after===10));
 const fresh=createGame('STASH',{build:'alchemist'});stash(fresh,'i3');assert.equal(effects(fresh,fresh.items[3]).heal,10);
});
test('thorns consumes armor first, spares ranged/consumables/lethal hits and can end a run',()=>{
 const s=createGame('THORNS');s.floor=2;startBattle(s);s.block=1;const p=combatPreview(s,'i1');assert.equal(p.retaliation,2);assert.equal(p.retaliationDamage,1);activate(s,'i1');assert.equal(s.hp,39);assert.equal(s.block,0);assert.equal(s.log[0].type,'reflect');
 const lethal=createGame('LETHAL');lethal.floor=2;startBattle(lethal);lethal.enemy.hp=5;assert.equal(combatPreview(lethal,'i1').retaliation,0);activate(lethal,'i1');assert.equal(lethal.phase,'camp');assert.equal(lethal.hp,40);
 const lose=createGame('REFLECT-LOSS');lose.floor=2;startBattle(lose);lose.hp=1;activate(lose,'i1');assert.equal(lose.phase,'lost');assert.ok(validSave(lose));
});
test('fortress setup and rage growth are reflected in exact action previews and restores',()=>{
 const fortress=createGame('FORTRESS');fortress.floor=4;startBattle(fortress);assert.equal(fortress.enemy.block,8);assert.deepEqual(intent(fortress),['guard',16]);endTurn(fortress);assert.equal(fortress.enemy.block,16);assert.ok(validSave(fortress));
 const rage=createGame('RAGE');rage.floor=7;startBattle(rage);assert.deepEqual(intent(rage),['attack',14]);rage.turn=4;assert.deepEqual(intent(rage),['attack',16]);rage.turn=40;assert.deepEqual(intent(rage),['attack',20]);rage.enemy.intentIndex=1;assert.deepEqual(intent(rage),['guard',14]);assert.ok(validSave(JSON.parse(JSON.stringify(rage))));
});
