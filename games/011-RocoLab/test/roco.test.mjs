import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RocoWorker} from '../bridge.mjs';
import {parseModelAction,requestRocoDecision} from '../model-api.mjs';
import {createLibraryServer} from '../../../server.mjs';

async function withWorker(fn){const worker=new RocoWorker();try{await fn(worker);}finally{worker.close();}}
const pet=(name,skills)=>({name,skills,nature:'坦率',ivs:{}});
const a=()=>pet('火花',['火苗','火焰箭','力量增效','防御']);
const b=()=>pet('喵喵',['抓挠','荆棘爪','休息回复','防御']);
const team=()=>({a:[a()],b:[b()]});
const creation=(mode='local')=>({mode,teams:team(),difficulty:'standard'});

test('real snapshot loads and every preset uses legal species and learned skills',()=>withWorker(async w=>{
 const c=await w.call('catalog');assert.equal(c.pets.length,461);assert.equal(c.skills.length,491);assert.equal(c.presets.length,2);
 for(const preset of c.presets)for(const p of preset.team){assert.ok(c.pets.find(v=>v.name===p.name).skills.every(n=>typeof n==='string'));assert.ok(p.skills.every(n=>c.pets.find(v=>v.name===p.name).skills.includes(n)));}
 const match=await w.call('create',{mode:'preset',teams:{a:c.presets[0].team,b:c.presets[1].team}});assert.equal(match.teams.a.length,3);assert.equal(match.mp.a,4);
}));
test('local double commit hides commands, settles once and rejects stale versions',()=>withWorker(async w=>{
 const match=await w.call('create',creation());
 const first=await w.call('step',{id:match.id,version:0,side:'a',action:[0]});
 assert.equal(first.turn,1);assert.equal(first.version,0);assert.deepEqual(first.pending,['a']);assert.equal(first.history.length,0);assert.ok(!JSON.stringify(first).includes('modelAction'));
 await assert.rejects(w.call('step',{id:match.id,version:0,side:'a',action:[1]}),/已提交/);
 const next=await w.call('step',{id:match.id,version:0,side:'b',action:[0]});assert.equal(next.version,1);assert.equal(next.history.length,1);assert.deepEqual(next.pending,[]);assert.ok(next.teams.b[0].hp<next.teams.b[0].maxHp);
 await assert.rejects(w.call('step',{id:match.id,version:0,side:'a',action:[0]}),/回合已更新/);
}));
test('illegal actions, illegal builds, IV overflow and battle overrides are rejected',()=>withWorker(async w=>{
 let config=creation();config.teams.a[0].skills=['不存在'];await assert.rejects(w.call('create',config),/无法学习/);
 config=creation();config.teams.a[0].ivs={hp:60,atk:60,def:60,speed:60};await assert.rejects(w.call('create',config),/三项/);
 config=creation();config.teams.a[0].stats={atk:2000};await assert.rejects(w.call('create',config),/对局请使用/);
 const match=await w.call('create',creation());await assert.rejects(w.call('step',{id:match.id,version:0,side:'a',action:[999]}),/不可用/);assert.equal((await w.call('get',{id:match.id})).version,0);
}));
test('damage factors reproduce a hand-calculated 135 damage and separate net turn effects',()=>withWorker(async w=>{
 const stats={hp:1000,atk:100,spatk:100,def:100,spdef:100,speed:100};
 const r=await w.call('calculate',{attacker:{...a(),stats},defender:{...b(),stats},skill:'火苗',power:50,hits:1});
 assert.equal(r.damage,135);assert.equal(r.factors.effectiveness,2);assert.equal(r.factors.stab,1.5);assert.equal(r.remaining,865);assert.ok(r.turnComparison.bAfter<1000);
 const buffed=await w.call('calculate',{attacker:{...a(),stats,modifiers:{atk_up:1,spatk_up:1}},defender:{...b(),stats},skill:'火苗',power:50});assert.equal(buffed.damage,270);
 const zero=await w.call('calculate',{attacker:{...a(),stats},defender:{...b(),stats},skill:'力量增效'});assert.equal(zero.damage,0);assert.equal(zero.hitsToKo,null);
}));
test('ground species use the DB short 地 mapping rather than normal-type fallback',()=>withWorker(async w=>{
 const c=await w.call('catalog'),ground=c.pets.find(p=>p.type==='地'&&p.skills.length);
 const p=pet(ground.name,[ground.skills[0]]),match=await w.call('create',{mode:'local',teams:{a:[p],b:[b()]}});assert.equal(match.teams.a[0].type,'地');
}));
test('upstream nested healing effect now executes and restores HP',()=>withWorker(async w=>{
 const r=await w.call('calculate',{attacker:{...b(),hpPercent:30},defender:a(),skill:'休息回复',defenderAction:3});
 assert.equal(r.damage,0);assert.ok(r.turnComparison.aAfter>r.turnComparison.aBefore);assert.equal(r.turnComparison.bBefore,r.turnComparison.bAfter);
}));
test('model context excludes current commands; fallback keeps model mode for the following turn',()=>withWorker(async w=>{
 const match=await w.call('create',creation('model')),context=await w.call('context',{id:match.id});
 assert.equal(context.pending,undefined);assert.ok(Array.isArray(context.actions));
 await assert.rejects(w.call('step',{id:match.id,version:0,side:'a',action:[0],modelAction:[99]}),/不可用/);
 assert.equal((await w.call('get',{id:match.id})).version,0);
 const next=await w.call('step',{id:match.id,version:0,side:'a',action:[3],fallback:true});assert.equal(next.version,1);assert.equal(next.mode,'model');assert.equal(next.history[0].automatic,true);
}));
test('switches are legal and standard AI completes a match without seeing player command',()=>withWorker(async w=>{
 const config=creation('preset');config.teams.a.push(pet('水蓝蓝',['水弹枪','气泡','魔法增效','防御']));config.teams.b.push(pet('火花',['火苗','防御']));
 let match=await w.call('create',config);assert.ok(match.actions.a.some(a=>a.kind==='switch'));
 match=await w.call('step',{id:match.id,version:0,side:'a',action:[-2,1]});assert.equal(match.active.a,1);
 for(let i=0;i<60&&!match.winner;i++){
  const attack=match.actions.a.filter(a=>a.kind==='skill'&&a.power>0).sort((a,b)=>b.baseDamage-a.baseDamage)[0]||match.actions.a.find(a=>a.kind==='recharge');
  match=await w.call('step',{id:match.id,version:match.version,side:'a',action:attack.id});
 }
 assert.ok(match.winner,'match must reach a winner');
}));
test('model parser accepts fenced JSON and rejects invented actions and wrong numeric types',()=>{
 const legal=[{id:[0]},{id:[-1]},{id:[-2,1]}];
 assert.deepEqual(parseModelAction('```json\n{"action":[-2,1],"reason":"resist"}\n```',legal).action,[-2,1]);
 for(const text of ['{"action":[99]}','{"action":["0"]}','{}',''])assert.throws(()=>parseModelAction(text,legal));
});
test('model retries invalid moves; prompts, outputs and logs are redacted',async()=>{
 const logs=[],requests=[];const context={turn:1,teams:{a:[],b:[]},active:{a:0,b:0},mp:{a:4,b:4},marks:{},weather:null,actions:[{id:[-1],label:'聚能'}],history:[]};
 const result=await requestRocoDecision({base:'https://api.deepseek.com',key:'private-secret',model:'test'},context,{retryDelayMs:0,trace:async e=>logs.push(e),fetchImpl:async(url,options)=>{requests.push(JSON.parse(options.body));return Response.json({choices:[{message:{content:requests.length===1?'{"action":[99]}':'{"action":[-1],"reason":"private-secret"}'},finish_reason:'stop'}]});}});
 assert.equal(result.attempts,2);assert.equal(requests[0].thinking.type,'disabled');assert.equal(requests[0].response_format.type,'json_object');assert.ok(!JSON.stringify(logs).includes('private-secret'));assert.ok(!JSON.stringify(result.trace).includes('private-secret'));assert.ok(requests[0].messages[0].content.includes('simultaneously'));
});
test('model HTTP auth failure does not retry or leak key',async()=>{
 let calls=0;await assert.rejects(requestRocoDecision({base:'https://api.deepseek.com',key:'secret',model:'test'},{actions:[],history:[]},{trace:async()=>{},fetchImpl:async()=>{calls++;return new Response('{}',{status:401});}}),/401/);assert.equal(calls,1);
});
test('one library serves Roco APIs, keeps private files hidden and prevents cross-origin requests',async()=>{
 let modelCalls=0;
 const server=createLibraryServer({rocoOptions:{trace:async()=>{},fetchImpl:async()=>{modelCalls++;return Response.json({choices:[{message:{content:'{"action":[-1],"reason":"recharge"}'},finish_reason:'stop'}]});}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,url=base+'/games/roco-lab/api/';
 const post=async(op,data,origin=base)=>fetch(url+op,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
 try{
  assert.equal((await fetch(url+'catalog')).status,200);assert.equal((await post('create',creation(),'http://elsewhere.invalid')).status,403);
  for(const path of ['worker.py','vendor/nrc/data/nrc.db','logs/model-api.jsonl','bridge.mjs'])assert.equal((await fetch(base+'/games/roco-lab/'+path)).status,404);
  const created=await (await post('create',creation('model'))).json();
  const invalid=await post('step',{id:created.id,version:0,side:'a',action:[99],config:{base:'https://model.invalid/v1',key:'test',model:'test'}});assert.equal(invalid.status,400);assert.equal(modelCalls,0);
  const failed=await post('step',{id:created.id,version:0,side:'a',action:[0]});assert.equal(failed.status,400);assert.equal((await (await post('get',{id:created.id})).json()).version,0);
  const ok=await (await post('step',{id:created.id,version:0,side:'a',action:[0],config:{base:'https://model.invalid/v1',key:'test',model:'test'}})).json();assert.equal(ok.version,1);assert.deepEqual(ok.modelDecision.action,[-1]);assert.equal(modelCalls,1);
 }finally{await new Promise(r=>server.close(r));}
});
