import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NODES,NODE_INDEX,RuleError,costOf,milestoneOf,unitOutput,rateOf,nodeRate,nodeCost,createGame,buy,tick,settle,autoBuy,nextGoal,validSave,format} from '../public/engine.js';

const node=id=>NODE_INDEX.get(id);
const fresh=(now=0)=>{const state=createGame(now);state.credits=0;return state;};

test('cost grows geometrically from the base price',()=>{
 const worker=node('worker');
 assert.equal(costOf(worker,0),10);
 assert.equal(costOf(worker,1),12);
 assert.equal(costOf(worker,10),Math.ceil(10*Math.pow(1.15,10)));
 assert.ok(costOf(worker,20)>costOf(worker,10));
 for(const item of NODES)assert.ok(costOf(item,0)===item.cost,item.id);
});

test('every tenth replica adds a quarter of base output',()=>{
 const worker=node('worker');
 assert.equal(unitOutput(worker,0),1);
 assert.equal(unitOutput(worker,9),1);
 assert.equal(unitOutput(worker,10),1.25);
 assert.equal(unitOutput(worker,25),1.5);
 assert.equal(milestoneOf(9),0);
 assert.equal(milestoneOf(10),1);
 assert.equal(milestoneOf(29),2);
});

test('rate sums per node output with milestones',()=>{
 const state=fresh();
 state.counts.worker=0;
 assert.equal(rateOf(state),0);
 state.counts.worker=10;
 assert.equal(rateOf(state),12.5);
 state.counts.queue=3;
 assert.equal(rateOf(state),12.5+18);
 assert.equal(nodeRate(state,'worker'),12.5);
 assert.equal(nodeRate(state,'cache'),0);
 const empty=fresh();
 empty.counts.worker=0;
 assert.equal(rateOf(empty),0);
});

test('buy spends credits, raises count and refuses short funds',()=>{
 const state=fresh();
 assert.throws(()=>buy(state,'worker'),error=>error instanceof RuleError&&error.code==='funds');
 state.credits=100;
 const result=buy(state,'worker');
 assert.equal(result.cost,Math.ceil(10*Math.pow(1.15,2)));
 assert.equal(state.counts.worker,3);
 assert.equal(state.credits,100-result.cost);
 assert.throws(()=>buy(state,'nope'),error=>error.code==='node');
 assert.equal(nodeCost(state,'worker'),costOf(node('worker'),3));
});

test('tick accrues by real elapsed time and never goes backwards',()=>{
 const state=fresh(1000);
 state.counts.worker=10;
 assert.equal(tick(state,3000),25);
 assert.equal(state.credits,25);
 assert.equal(state.totalEarned,25);
 assert.equal(state.lastSeen,3000);
 assert.equal(tick(state,2000),0);
 assert.equal(state.lastSeen,2000);
 assert.equal(state.credits,25);
 assert.equal(tick(state,3000),12.5);
});

test('offline settlement pays half rate and caps at eight hours',()=>{
 const state=fresh(0);
 state.counts.worker=1;
 const brief=settle(state,60000);
 assert.equal(brief.gain,30);
 assert.equal(brief.elapsed,60);
 const long=fresh(0);
 long.counts.worker=100;
 const capped=settle(long,3600e3*12);
 assert.equal(capped.applied,8*3600);
 assert.equal(capped.gain,rateOf(long)*8*3600*0.5);
 assert.ok(capped.elapsed>capped.applied);
 assert.equal(settle(fresh(0),0).gain,0);
});

test('auto buy stops when nothing is affordable',()=>{
 const state=fresh();
 state.credits=200;
 const bought=autoBuy(state,100);
 assert.ok(bought>0);
 assert.ok(state.credits>=0);
 assert.ok(state.credits<costOf(node('worker'),state.counts.worker));
 const rich=fresh();
 rich.credits=1e12;
 assert.equal(autoBuy(rich,5),5);
 assert.equal(autoBuy(rich,3),3);
});

test('next goal points at the cheapest unowned node',()=>{
 assert.equal(nextGoal(createGame()).id,'queue');
 const state=createGame();
 state.counts.queue=1;
 assert.equal(nextGoal(state).id,'index');
 for(const item of NODES)state.counts[item.id]=1;
 assert.equal(nextGoal(state),null);
});

test('save validation rejects malformed progress',()=>{
 const state=createGame(1000);
 assert.ok(validSave(state,1000));
 assert.equal(validSave({...state,version:2},1000),false);
 assert.equal(validSave({...state,credits:-1},1000),false);
 assert.equal(validSave({...state,credits:'a'},1000),false);
 assert.equal(validSave({...state,counts:{...state.counts,worker:1.5}},1000),false);
 assert.equal(validSave({...state,counts:{...state.counts,worker:-3}},1000),false);
 assert.equal(validSave({...state,counts:{}}),false);
 assert.equal(validSave({...state,auto:'yes'},1000),false);
 assert.equal(validSave({...state,startedAt:'nope'},1000),false);
 assert.equal(validSave({...state,lastSeen:'soon'},1000),false);
 assert.equal(validSave({...state,lastSeen:1000+120e3},1000),false);
 assert.equal(validSave(null),false);
});

test('restored progress keeps counting from the same rate',()=>{
 const state=createGame(0);
 state.counts.worker=20;
 state.credits=500;
 const restored=JSON.parse(JSON.stringify(state));
 assert.ok(validSave(restored,0));
 const before=restored.credits;
 tick(restored,10000);
 assert.equal(restored.credits,before+rateOf(state)*10);
});

test('numbers stay readable across magnitudes',()=>{
 assert.equal(format(0),'0');
 assert.equal(format(9.5),'9.5');
 assert.equal(format(42.7),'42');
 assert.equal(format(999),'999');
 assert.equal(format(1500),'1.50K');
 assert.equal(format(2600000),'2.60M');
 assert.equal(format(4.5e9),'4.50B');
 assert.equal(format(1e15),'1.00P');
 assert.equal(format(Number.NaN),'0');
});
