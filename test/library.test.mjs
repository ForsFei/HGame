import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {get} from 'node:http';
import {createLibraryServer} from '../server.mjs';
import {GAMES} from '../library/catalog.js';
import {createGame,roll} from '../games/001-YachtDice/public/engine.js';
async function run(fn,options){const server=createLibraryServer(options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;try{await fn(base);}finally{await new Promise(resolve=>server.close(resolve));}}
test('one server serves the library and all isolated game asset trees',()=>run(async base=>{
 const info=await (await fetch(`${base}/api/library`)).json();assert.equal(info.app,'hgame-library');assert.equal(info.games.length,GAMES.length);assert.equal(new Set(info.games.map(g=>g.url)).size,GAMES.length);
 assert.match(await (await fetch(base)).text(),/id="games"/);
 for(const game of GAMES){
  const url=`${base}/games/${game.id}/`,response=await fetch(url);assert.equal(response.status,200,game.id);const html=await response.text();assert.match(html,/\/library\/game-shell.js/);assert.ok(!/(?:src|href)="\/(?:app\.js|style\.css|engine\.js)/.test(html),game.id);
  for(const file of ['app.js','engine.js','style.css',...game.files]){const asset=await fetch(url+file);assert.equal(asset.status,200,`${game.id}/${file}`);assert.ok((await asset.text()).length>0);}
  assert.equal((await fetch(url,{method:'HEAD'})).status,200);
 }
}));
test('canonical paths redirect and unknown or private files remain unavailable',()=>run(async base=>{
 const response=await fetch(`${base}/games/pack-lab?x=1`,{redirect:'manual'});assert.equal(response.status,308);assert.equal(response.headers.get('location'),'/games/pack-lab/?x=1');
 for(const path of ['/games/absent/','/games/pack-lab/server.mjs','/games/yacht-dice/model-api.mjs','/games/yacht-dice/logs/test.jsonl','/.env','/README.md','/library/../server.mjs','/games/pack-lab/%2e%2e%2fserver.mjs'])assert.equal((await fetch(base+path)).status,404,path);
 assert.equal((await fetch(base,{method:'POST'})).status,405);
 assert.equal((await fetch(`${base}/api/library`,{headers:{Origin:'http://example.invalid'}})).status,403);
 const badHost=await new Promise((resolve,reject)=>{get(base,{headers:{Host:'example.invalid'}},response=>{response.resume();resolve(response.statusCode);}).on('error',reject);});assert.equal(badHost,403);
}));
test('three games load one shared quiet implementation while CrateShift retains its own adapter',()=>run(async base=>{
 for(const file of ['quiet.js','quiet.css']){const response=await fetch(`${base}/shared/${file}`);assert.equal(response.status,200);assert.ok((await response.text()).length>0);}
 for(const id of ['node-sweep','signal-route','outage-reset']){
  const html=await (await fetch(`${base}/games/${id}/`)).text(),app=await (await fetch(`${base}/games/${id}/app.js`)).text();
  assert.match(html,/href="\/shared\/quiet\.css"/);assert.match(app,/from '\/shared\/quiet\.js'/);
  for(const file of ['quiet.js','quiet.css'])assert.equal((await fetch(`${base}/games/${id}/${file}`)).status,404);
 }
 assert.equal((await fetch(`${base}/games/crate-shift/quiet.js`)).status,200);assert.equal((await fetch(`${base}/games/crate-shift/quiet.css`)).status,200);
 assert.equal((await fetch(`${base}/shared/../server.mjs`)).status,404);
}));
test('Yacht model calls use the same server without starting another listening service',()=>run(async base=>{
 const game=createGame([{name:'local',type:'model'}]);roll(game,()=>0.5);const body={config:{base:'https://model.invalid/v1',model:'test-model',key:'test-key'},game};
 const response=await fetch(`${base}/games/yacht-dice/api/decision`,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});assert.equal(response.status,200);const data=await response.json();assert.equal(data.action.type,'score');assert.ok(data.requestId);
 const cross=await fetch(`${base}/games/yacht-dice/api/decision`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://elsewhere.invalid'},body:JSON.stringify(body)});assert.equal(cross.status,403);
 const bad=await fetch(`${base}/api/decision`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(bad.status,400);
},{modelOptions:{trace:async()=>{},fetchImpl:async()=>Response.json({choices:[{message:{content:'{"type":"score","category":"choice"}'},finish_reason:'stop'}]}),retryDelayMs:0}}));
test('every former launcher targets the shared service and each folder has a stable sequence',async()=>{
 assert.deepEqual(GAMES.map(g=>g.number),Array.from({length:GAMES.length},(_,n)=>String(n+1).padStart(3,'0')));
 for(const game of GAMES){const launcher=await readFile(new URL(`../games/${game.folder}/启动游戏.bat`,import.meta.url),'utf8');assert.match(launcher,/start-library\.ps1/);assert.match(launcher,new RegExp(game.id));const server=await readFile(new URL(`../games/${game.folder}/server.mjs`,import.meta.url),'utf8');assert.match(server,/startLibrary/);assert.ok(!/\.listen\(/.test(server),game.id);}
});
