import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startBattle,activate,endTurn,skipReward,selectRoute,routePreview,routeFor,enemyStats,intent,validSave,forge,recordRun,replayConfig} from '../public/engine.js';
const fresh=seed=>createGame(seed,{version:3});
function fight(s){startBattle(s);for(let n=0;n<60&&s.phase==='battle';n++){activate(s,'i1');if(s.phase==='battle'){activate(s,'i2');endTurn(s);}}assert.equal(s.phase,'camp');}
function first(seed='ROUTE'){const s=fresh(seed);fight(s);return s;}
test('v3 route previews are pure, show exact elite stats and selecting does not heal or pay',()=>{
 const s=first(),before=structuredClone(s);const p=routePreview(s,'elite');assert.equal(p.floor,1);assert.equal(p.hp,33);assert.equal(p.gold,10);assert.equal(p.attackBonus,2);assert.deepEqual(s,before);
 selectRoute(s,'supply');assert.equal(s.nextRoute,'supply');assert.equal(s.hp,before.hp);assert.equal(s.gold,before.gold);assert.equal(s.floor,0);assert.ok(validSave(s));
 const restored=JSON.parse(JSON.stringify(s));assert.equal(routePreview(restored).route,'supply');assert.equal(routePreview(restored).gold,0);
 const pending=structuredClone(restored);assert.throws(()=>startBattle(restored));assert.deepEqual(restored,pending);
});
test('elite uses increased HP and intent values, and pays four additional gold exactly once',()=>{
 const s=first();skipReward(s);selectRoute(s,'elite');const gold=s.gold;startBattle(s);assert.equal(s.enemy.hp,33);assert.deepEqual(intent(s),['guard',8]);assert.equal(routePreview(s).gold,10);assert.ok(validSave(s));
 activate(s,'i1');activate(s,'i2');endTurn(s);assert.equal(s.enemy.block,8);assert.deepEqual(intent(s),['attack',10]);
 for(let n=0;n<20&&s.phase==='battle';n++){activate(s,'i1');if(s.phase==='battle'){activate(s,'i2');endTurn(s);}}
 assert.equal(s.phase,'camp');assert.equal(s.gold,gold+10);assert.equal(s.recap[1].route,'elite');assert.equal(s.recap[1].result,'won');assert.ok(validSave(s));const before=structuredClone(s);assert.throws(()=>activate(s,'i1'));assert.deepEqual(s,before);
});
test('supply advances one floor with capped recovery, no victory income and only consumable rewards',()=>{
 const s=first();s.hp=35;skipReward(s);selectRoute(s,'supply');const gold=s.gold,items=structuredClone(s.items);startBattle(s);
 assert.equal(s.floor,1);assert.equal(s.phase,'camp');assert.equal(s.hp,40);assert.equal(s.gold,gold);assert.deepEqual(s.items,items);assert.deepEqual(s.rewards,['herb','flask','bomb']);assert.equal(s.enemy.hp,0);assert.equal(s.rewardTaken,false);assert.equal(s.shopRefreshes,0);
 assert.deepEqual(s.recap[1],{floor:1,startHp:35,endHp:40,turns:0,dealt:0,taken:0,healed:0,result:'supply',route:'supply'});assert.equal(s.log[0].heal,5);assert.ok(validSave(s));
 const before=structuredClone(s);assert.throws(()=>startBattle(s));assert.deepEqual(s,before);
});
test('first and final routes are fixed; a complete supply path still requires the final battle',()=>{
 const s=fresh('FULL-ROUTE');assert.equal(routePreview(s,'elite').route,'normal');assert.throws(()=>selectRoute(s,'elite'));fight(s);
 for(let floor=1;floor<=6;floor++){skipReward(s);selectRoute(s,'supply');startBattle(s);assert.equal(s.floor,floor);assert.ok(validSave(JSON.parse(JSON.stringify(s))));}
 assert.throws(()=>selectRoute(s,'supply'));assert.equal(routePreview(s,'supply').route,'boss');skipReward(s);startBattle(s);assert.equal(s.floor,7);assert.equal(s.phase,'battle');assert.equal(s.enemy.hp,88);assert.equal(routeFor(s),'boss');
 while(s.phase==='battle')endTurn(s);assert.equal(s.phase,'lost');assert.ok(validSave(s));const records=recordRun([],s);assert.equal(records[0].state.routeChoices.filter(r=>r==='supply').length,6);
 const replay=replayConfig(records[0]),next=createGame(replay.seed,replay);assert.equal(next.version,3);assert.equal(next.routeChoices[1],null);assert.equal(next.nextRoute,'normal');
});
test('elite modifiers stack with fixed floor traits and are included in saved enemy HP validation',()=>{
 const s=first('STACK');for(let floor=1;floor<=3;floor++){skipReward(s);selectRoute(s,'supply');startBattle(s);}
 skipReward(s);selectRoute(s,'elite');const p=routePreview(s);assert.equal(p.floor,4);assert.equal(p.hp,65);assert.equal(p.trait.id,'fortress');startBattle(s);assert.equal(s.enemy.block,8);assert.deepEqual(intent(s),['guard',18]);assert.equal(enemyStats(s).hp,65);assert.ok(validSave(s));
 const restored=JSON.parse(JSON.stringify(s));assert.ok(validSave(restored));assert.deepEqual(intent(restored),['guard',18]);assert.equal(validSave({...restored,enemy:{...restored.enemy,hp:66}}),false);
});
test('normal v3 fights retain v2 seeded rewards, prices, forging and combat results',()=>{
 const a=first('SAME'),b=createGame('SAME',{version:2});fight(b);assert.deepEqual(a.offers,b.offers);assert.deepEqual(a.rewards,b.rewards);assert.equal(a.hp,b.hp);assert.equal(a.gold,b.gold);
 forge(a,'i1');forge(b,'i1');skipReward(a);skipReward(b);selectRoute(a,'normal');fight(a);fight(b);assert.deepEqual(a.offers,b.offers);assert.deepEqual(a.rewards,b.rewards);assert.equal(a.hp,b.hp);assert.equal(a.gold,b.gold);
});
test('v1/v2 saves stay fixed and malformed route data cannot enter saves or archives',()=>{
 for(const version of [1,2]){const s=createGame('OLD',{version});fight(s);assert.ok(validSave(s));const before=structuredClone(s);assert.throws(()=>selectRoute(s,'elite'));assert.deepEqual(s,before);assert.equal(routePreview(s,'supply').route,'normal');assert.equal(validSave({...s,nextRoute:'supply'}),false);}
 const s=first('BAD');for(const change of [{nextRoute:'boss'},{routeChoices:null},{routeChoices:['normal']},{routeChoices:s.routeChoices.map((r,n)=>n===2?'elite':r)}])assert.equal(validSave({...s,...change}),false);
 const battle=structuredClone(s);skipReward(battle);selectRoute(battle,'elite');startBattle(battle);assert.equal(validSave({...battle,routeChoices:battle.routeChoices.map((r,n)=>n===1?null:r)}),false);
});
