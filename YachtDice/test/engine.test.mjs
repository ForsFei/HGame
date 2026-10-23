import {test} from 'node:test';
import assert from 'node:assert/strict';
import {categories,score,upper,total,createGame,roll,commit,botDecision,validateDecision} from '../public/engine.js';
import {makeServer} from '../server.mjs';

test('Switch-style scoring boundaries and strict full house',()=>{
 assert.equal(categories.length,12);
 assert.equal(score([1,2,3,4,6],'small'),15);
 assert.equal(score([1,2,3,4,4],'small'),15);
 assert.equal(score([1,2,3,5,6],'small'),0);
 assert.equal(score([2,3,4,5,6],'large'),30);
 assert.equal(score([1,2,3,4,5],'large'),30);
 assert.equal(score([1,2,3,4,4],'large'),0);
 assert.equal(score([6,6,6,6,2],'four'),26);
 assert.equal(score([6,6,6,5,5],'house'),28);
 assert.equal(score([6,6,6,6,6],'house'),0);
 assert.equal(score([6,6,6,6,6],'yacht'),50);
 assert.equal(score([6,6,6,6,5],'yacht'),0);
 assert.equal(score([6,6,6,6,6],'four'),30);
 assert.equal(score([1,2,3,4,5],'choice'),15);
 assert.equal(score([6,6,6,1,1],'sixes'),18);
 const sheet={ones:3,twos:6,threes:9,fours:12,fives:15,sixes:18};
 assert.equal(upper(sheet),63);assert.equal(total(sheet),98);sheet.ones=2;assert.equal(total(sheet),62);
});
test('hold, roll limit, duplicate scoring and zero consumption',()=>{
 const g=createGame([{name:'a',type:'human'},{name:'b',type:'human'}]);
 assert.throws(()=>commit(g,'ones'));roll(g,()=>0);g.held[0]=true;roll(g,()=>.99);assert.deepEqual(g.dice,[1,6,6,6,6]);roll(g,()=>.5);assert.throws(()=>roll(g));commit(g,'sixes');assert.equal(g.turn,1);assert.equal(g.rolls,0);assert.ok(g.held.every(v=>!v));
 roll(g,()=>0);commit(g,'yacht');roll(g,()=>0);assert.throws(()=>commit(g,'sixes'));commit(g,'twos');assert.equal(g.players[0].sheet.twos,0);
});
test('model actions reject illegal choices and indices',()=>{
 const g=createGame([{name:'a'}]);roll(g);assert.deepEqual(validateDecision({type:'roll',keep:[0,4]},g),{type:'roll',keep:[0,4]});
 for(const keep of [[-1],[5],[1,1],[0,1,2,3,4],['0']])assert.throws(()=>validateDecision({type:'roll',keep},g));
 assert.throws(()=>validateDecision({type:'score',category:'oops'},g));g.rolls=3;assert.throws(()=>validateDecision({type:'roll',keep:[]},g));
 commit(g,'ones');assert.throws(()=>validateDecision({type:'score',category:'ones'},g));
});
test('all built-in levels finish entire 4-player games',()=>{
 let seed=123456;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const level of ['easy','normal','hard']){
  const g=createGame(Array.from({length:4},(_,i)=>({name:`p${i}`,type:'cpu',level})));let actions=0;
  while(!g.done){assert.ok(actions++<200);if(!g.rolls)roll(g,rng);const a=validateDecision(botDecision(g,level,rng),g);if(a.type==='score')commit(g,a.category);else{g.held=g.dice.map((_,i)=>a.keep.includes(i));roll(g,rng);}}
  for(const p of g.players){assert.equal(Object.keys(p.sheet).length,12);assert.ok(total(p.sheet)>=0&&total(p.sheet)<=323);}
 }
});
test('local service and mock model proxy handle success and failure',async()=>{
 const http=await import('node:http');let captured;
 const mock=http.createServer(async(req,res)=>{let body='';for await(const b of req)body+=b;captured=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:captured.model==='invalid'?'bad output':'{"type":"score","category":"choice"}'}}]}));});
 await new Promise(r=>mock.listen(0,'127.0.0.1',r));const server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;const g=createGame([{name:'a',type:'model'}]);roll(g);
 const config={key:'test-secret',model:'mock',base:`http://127.0.0.1:${mock.address().port}/v1`};
 const request=(body,headers={})=>fetch(base+'/api/decision',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 try{
  assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/missing')).status,404);
  assert.equal((await fetch(base,{headers:{Origin:'https://evil.example'}})).status,403);
  const ok=await request({game:g,config});assert.equal(ok.status,200);assert.deepEqual((await ok.json()).action,{type:'score',category:'choice'});assert.equal(captured.model,'mock');assert.ok(!JSON.stringify(captured).includes('test-secret'));
  assert.equal((await request({game:g,config:{...config,model:'invalid'}})).status,502);
  assert.equal((await request({game:g,config:{...config,base:'http://example.com'}})).status,400);
  assert.equal((await request({game:g,config:{...config,key:''}})).status,400);
 }finally{await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>mock.close(r))]);}
});
