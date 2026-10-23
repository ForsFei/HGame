import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';
import {validateDecision} from './public/engine.js';
export function makeServer() {
 const root=fileURLToPath(new URL('./public/',import.meta.url));
 return http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try {
   const expected=`http://${req.headers.host}`;
   if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'') || (req.headers.origin && req.headers.origin!==expected)) return send(403,{error:'仅允许本机同源访问'});
   if(req.url==='/api/decision' && req.method==='POST') {
    let body=''; for await(const chunk of req) {body+=chunk;if(body.length>40000)return send(413,{error:'请求过大'});}
    const {config,game}=JSON.parse(body);
    if(!config?.key || !config?.model || !game?.players?.[game.turn] || !Array.isArray(game.dice) || game.dice.length!==5) return send(400,{error:'请填写 API Key、模型和有效对局'});
    const endpoint=new URL(config.base.replace(/\/+$/,'')+'/chat/completions');
    if(endpoint.protocol!=='https:' && !(endpoint.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname))) return send(400,{error:'接口必须使用 HTTPS；本机模型可使用 HTTP'});
    if(endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return send(400,{error:'请填写不含账号、参数的接口基础地址'});
    const rules='Yacht dice: 5 dice, up to 3 rolls per turn, 12 categories. ones..sixes=sum matching face; upper subtotal>=63 bonus35; choice=sum; four=at least4 equal then sum ALL5; house=exactly3+2 then sum; small=4 consecutive distinct faces 15; large=5 consecutive 30; yacht=5 equal 50. Each category used once. Maximize final score.';
    const context={dice:game.dice,rollsUsed:game.rolls,players:game.players.map(p=>({name:p.name,sheet:p.sheet})),currentPlayer:game.turn};
    const tokenLimit=endpoint.hostname==='api.openai.com'||/^(gpt-|o\d)/.test(config.model)?{max_completion_tokens:4096}:{max_tokens:2048};
    const providerOptions=endpoint.hostname==='api.deepseek.com'?{thinking:{type:'disabled'}}:{};
    const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(45000),redirect:'error',headers:{'Content-Type':'application/json','Authorization':`Bearer ${config.key}`},body:JSON.stringify({model:config.model,messages:[{role:'system',content:rules+' Return ONLY JSON: {"type":"roll","keep":[0,2]} (zero-based dice indices to KEEP, fewer than5) or {"type":"score","category":"ones"}. After roll3 you MUST score. Only unfilled categories. No markdown.'},{role:'user',content:JSON.stringify(context)}],...tokenLimit,...providerOptions})});
    if(!response.ok) return send(502,{error:`模型接口返回 HTTP ${response.status}，请检查地址、模型、余额与 Key`});
    const data=await response.json(), content=data.choices?.[0]?.message?.content;
    if(typeof content!=='string') return send(502,{error:'模型未返回文本决策'});
    const match=content.match(/\{[\s\S]*\}/);if(!match)return send(502,{error:'模型未返回 JSON 决策'});
    return send(200,{action:validateDecision(JSON.parse(match[0]),game)});
   }
   if(req.method!=='GET')return send(405,{error:'不支持的请求'});
   const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/engine.js':'engine.js'};
   const file=files[req.url?.split('?')[0]];if(!file)return send(404,{error:'未找到页面'});
   res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]+'; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(await readFile(resolve(root,file)));
  } catch(error) {send(502,{error:error.name==='TimeoutError'?'模型响应超时，请重试':'请求失败：请检查接口配置或模型返回格式'});}
 });
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const port=Number(process.env.PORT||43170); const server=makeServer();
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已被占用。可先尝试打开 http://127.0.0.1:${port}；或设置 PORT 后重启。`:e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Yacht Dice ready: http://127.0.0.1:${port}`));
}
