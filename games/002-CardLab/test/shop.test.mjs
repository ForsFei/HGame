import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSeededGame,makeShop,reroll,rerollCost,nextStage,buyModule,validSave} from '../public/engine.js';
const shop=(version=5)=>{const s=createSeededGame('SHOP-TEST',{version});s.phase='shop';makeShop(s);return s;};

test('v5 free refresh is once per run, survives save and stage changes, and keeps seeded results',()=>{
 const a=shop(),b=JSON.parse(JSON.stringify(a));a.money=b.money=0;
 assert.equal(rerollCost(a),0);reroll(a);reroll(b);assert.equal(a.money,0);assert.deepEqual(a.shop,b.shop);assert.equal(a.freeRerollUsed,true);assert.ok(validSave(a));
 const before=structuredClone(a);assert.throws(()=>reroll(a));assert.deepEqual(a,before);
 const restored=JSON.parse(JSON.stringify(a));restored.money=6;reroll(restored);assert.equal(restored.money,3);nextStage(restored);assert.equal(rerollCost(restored),3);assert.ok(validSave(restored));
 assert.equal(validSave({...a,freeRerollUsed:undefined}),false);assert.equal(validSave({...a,freeRerollUsed:1}),false);
});

test('v3/v4 retain paid refresh and original initial shop/deck streams',()=>{
 for(const version of [3,4]){const s=shop(version),fresh=shop();assert.equal(rerollCost(s),3);assert.deepEqual(s.hand,fresh.hand);assert.deepEqual(s.shop,fresh.shop);const money=s.money;reroll(s);assert.equal(s.money,money-3);assert.ok(validSave(s));}
});

test('replacement purchase credits resale value atomically and preserves the occupied slot',()=>{
 const s=shop();s.modules=['spark','pair','even','odd','red'];s.shop.modules[0]={id:'anchor',bought:false};s.money=6;
 buyModule(s,0,'spark');assert.equal(s.money,0);assert.deepEqual(s.modules,['anchor','pair','even','odd','red']);assert.equal(s.shop.modules[0].bought,true);assert.ok(validSave(s));
 const before=structuredClone(s);assert.throws(()=>buyModule(s,0,'pair'));assert.deepEqual(s,before);
});

test('invalid replacement, insufficient funds and duplicate module reject without mutation',()=>{
 const s=shop();s.modules=['spark','pair','even','odd','red'];s.shop.modules[0]={id:'anchor',bought:false};s.money=5;
 for(const replacement of ['spark','missing',undefined]){const before=structuredClone(s);assert.throws(()=>buyModule(s,0,replacement));assert.deepEqual(s,before);}
 s.money=20;s.shop.modules[0]={id:'pair',bought:false};let before=structuredClone(s);assert.throws(()=>buyModule(s,0,'spark'));assert.deepEqual(s,before);
 s.shop.modules[0]={id:'anchor',bought:false};s.phase='play';before=structuredClone(s);assert.throws(()=>buyModule(s,0,'spark'));assert.deepEqual(s,before);
});
