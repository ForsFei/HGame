import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDecision,requestDecision} from '../model-api.mjs';
import {createGame,roll} from '../public/engine.js';
import {makeServer} from '../server.mjs';
const config={base:'https://api.deepseek.com',model:'deepseek-flash',key:'test-secret'};
const game=()=>{const s=createGame([{name:'test',type:'model'}]);roll(s,()=>.5);return s;};
const success=(content='{"type":"score","category":"choice"}')=>Response.json({choices:[{message:{content},finish_reason:'stop'}]});
test('parser accepts a single fenced or explained action, rejects ambiguity and illegal moves',()=>{
 const s=game();for(const content of ['{"type":"score","category":"choice"}','```json\n{"type":"score","category":"choice"}\n```','Decision: {"type":"score","category":"choice"}'])assert.equal(parseDecision(content,s).category,'choice');
 for(const [content,code]of [['','EMPTY_CONTENT'],['text','INVALID_JSON'],['{bad}','INVALID_JSON'],['{"type":"roll","keep":[9]}','INVALID_ACTION'],['{"type":"score","category":"ones"} {"type":"score","category":"choice"}','INVALID_JSON']])assert.throws(()=>parseDecision(content,s),e=>e.code===code);
});
test('DeepSeek JSON mode and retry recover empty, malformed, illegal and interrupted replies without changing state',async()=>{
 for(const first of [()=>success(''),()=>success('{bad}'),()=>success('{"type":"roll","keep":[7]}'),()=>new Response('<html>gateway</html>'),()=>{throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}});}]){
  const s=game(),before=structuredClone(s);let calls=0;
  const result=await requestDecision(config,s,{retryDelayMs:0,fetchImpl:async(url,options)=>{const payload=JSON.parse(options.body);assert.equal(payload.response_format.type,'json_object');assert.equal(payload.thinking.type,'disabled');assert.ok(payload.messages[1].content.includes('allowedCategories'));return ++calls===1?first():success();}});
  assert.equal(result.attempts,2);assert.equal(calls,2);assert.equal(result.action.category,'choice');assert.deepEqual(s,before);
 }
});
test('transient HTTP statuses retry once; configuration and billing errors do not retry or leak response bodies',async()=>{
 for(const status of [400,401,402,403,404,422,429,500,502,503,504]){
  let calls=0;await assert.rejects(requestDecision(config,game(),{retryDelayMs:0,fetchImpl:async()=>{calls++;return new Response('test-secret upstream-private-detail',{status});}}),e=>e.code===`HTTP_${status}`&&!e.message.includes('test-secret')&&!e.message.includes('upstream-private-detail'));
  assert.equal(calls,[429,500,502,503,504].includes(status)?2:1);
 }
});
test('request and response-body timeouts are bounded and retried once',async()=>{
 for(const delayedBody of [false,true]){
  let calls=0;
  await assert.rejects(requestDecision(config,game(),{timeoutMs:15,retryDelayMs:0,fetchImpl:async(url,{signal})=>{calls++;const pending=()=>new Promise((resolve,reject)=>{const timer=setTimeout(resolve,200);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason);},{once:true});});if(delayedBody)return {ok:true,text:pending};return pending();}}),e=>e.code==='TIMEOUT'&&e.attempts===2);
  assert.equal(calls,2);
 }
});
test('truncated output is distinct and generic compatible services do not receive DeepSeek-specific fields',async()=>{
 let calls=0;
 await assert.rejects(requestDecision({...config,base:'https://example.com/v1'},game(),{retryDelayMs:0,fetchImpl:async(url,options)=>{calls++;const p=JSON.parse(options.body);assert.equal(p.thinking,undefined);assert.equal(p.response_format,undefined);return Response.json({choices:[{finish_reason:'length',message:{content:'{"type":'}}]});}}),e=>e.code==='OUTPUT_TRUNCATED');assert.equal(calls,2);
});
test('local route returns classified errors, safe request IDs, retry count and invalid-request errors',async()=>{
 const server=makeServer({trace:async()=>{},retryDelayMs:0,fetchImpl:async()=>{throw new TypeError('secret detail',{cause:{code:'ECONNRESET'}});}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const response=await fetch(base+'/api/decision',{method:'POST',body:JSON.stringify({config,game:game()})});const data=await response.json();assert.equal(response.status,502);assert.equal(data.code,'NETWORK_ERROR');assert.equal(data.attempts,2);assert.match(data.requestId,/^[a-f0-9]{8}$/);assert.ok(!JSON.stringify(data).includes('secret'));
  const bad=await fetch(base+'/api/decision',{method:'POST',body:'bad json'});assert.equal(bad.status,400);assert.equal((await bad.json()).code,'INVALID_REQUEST');
 }finally{await new Promise(r=>server.close(r));}
});
