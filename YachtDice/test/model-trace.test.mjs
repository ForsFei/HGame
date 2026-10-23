import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative} from 'node:path';
import {createTraceLogger,redactTrace} from '../model-trace.mjs';
import {requestDecision} from '../model-api.mjs';
import {createGame,roll} from '../public/engine.js';
const config={base:'https://api.deepseek.com',key:'test-secret-key',model:'deepseek-flash'};
const game=()=>{const s=createGame([{name:'test',type:'model'}]);roll(s,()=>.5);return s;};
test('trace records exact sent messages, both attempts, raw outputs and validated decision without credentials',async()=>{
 const events=[],payloads=[];let calls=0;
 const s=game();await requestDecision(config,s,{requestId:'trace123',trace:async e=>events.push(e),retryDelayMs:0,fetchImpl:async(url,o)=>{payloads.push(JSON.parse(o.body));return Response.json({choices:[{message:{content:++calls===1?'':`{"type":"score","category":"choice"}`},finish_reason:'stop'}],usage:{total_tokens:32},debug:config.key});}});
 assert.deepEqual(events.map(e=>e.event),['request','response','error','request','response','decision']);
 assert.deepEqual(events.filter(e=>e.event==='request').map(e=>e.body),payloads);
 assert.equal(events[1].body.includes('[REDACTED]'),true);assert.equal(events[2].code,'EMPTY_CONTENT');assert.equal(events[2].willRetry,true);assert.deepEqual(events[5].action,{type:'score',category:'choice'});assert.equal(events[5].usage.total_tokens,32);
 assert.ok(events.every(e=>e.requestId==='trace123'&&e.timestamp));assert.ok(!JSON.stringify(events).includes(config.key));assert.ok(!JSON.stringify(events).includes('Authorization'));
});
test('HTTP error bodies and network failures are logged; logging failures do not resend or fail a valid decision',async()=>{
 const events=[];await assert.rejects(requestDecision(config,game(),{trace:async e=>events.push(e),fetchImpl:async()=>new Response(`account error ${config.key}`,{status:402})}),e=>e.code==='HTTP_402');
 assert.equal(events[1].httpStatus,402);assert.equal(events[1].body,'account error [REDACTED]');assert.equal(events[2].willRetry,false);
 let calls=0;const result=await requestDecision(config,game(),{trace:async()=>{throw Error('disk full');},fetchImpl:async()=>{calls++;return Response.json({choices:[{message:{content:'{"type":"score","category":"choice"}'}}]});}});assert.equal(result.action.category,'choice');assert.equal(calls,1);
});
test('JSONL writer serializes concurrent records and uses Shanghai calendar dates; redaction handles nested and JSON-escaped secrets',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'yacht-trace-test-'));
 try{
  const logger=createTraceLogger(dir);await Promise.all(Array.from({length:8},(_,i)=>logger({timestamp:'2026-10-23T17:00:00.000Z',event:'test',i})));
  assert.deepEqual(await readdir(dir),['model-api-2026-10-24.jsonl']);
  const lines=(await readFile(join(dir,'model-api-2026-10-24.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.deepEqual(lines.map(e=>e.i),[0,1,2,3,4,5,6,7]);
  const key='secret"quoted';const value=redactTrace({body:JSON.stringify({echo:key}),Authorization:'Bearer something',nested:{api_key:'different'}},key);assert.equal(value.Authorization,'[REDACTED]');assert.equal(value.nested.api_key,'[REDACTED]');assert.ok(!value.body.includes('quoted'));
 }finally{const child=relative(resolve(tmpdir()),resolve(dir));assert.ok(child&&!child.startsWith('..')&&!child.includes(':'));await rm(dir,{recursive:true,force:true});}
});
