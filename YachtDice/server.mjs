import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';
import {requestDecision,ModelError} from './model-api.mjs';
import {randomUUID} from 'node:crypto';
import {createTraceLogger} from './model-trace.mjs';
export function makeServer(modelOptions={}) {
 const root=fileURLToPath(new URL('./public/',import.meta.url));
 const trace=modelOptions.trace??createTraceLogger();
 return http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try {
   const expected=`http://${req.headers.host}`;
   if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'') || (req.headers.origin && req.headers.origin!==expected)) return send(403,{error:'仅允许本机同源访问'});
   if(req.url==='/api/decision' && req.method==='POST') {
    let body=''; for await(const chunk of req) {body+=chunk;if(body.length>40000)return send(413,{error:'请求过大'});}
    const {config,game}=JSON.parse(body);
    if(!config?.key || !config?.model || !game?.players?.[game.turn] || !Array.isArray(game.dice) || game.dice.length!==5) return send(400,{error:'请填写 API Key、模型和有效对局'});
    const requestId=randomUUID().slice(0,8);
    try {
     return send(200,{...await requestDecision(config,game,{...modelOptions,trace,requestId}),requestId});
    } catch(error) {
     const known=error instanceof ModelError;
     const code=known?error.code:'INTERNAL_ERROR';
     // Console output stays compact. Detailed redacted traces are written locally.
     console.warn(`[model] ${requestId} ${code} attempts=${error.attempts||1}`);
     return send(known?error.status:500,{error:known?error.message:'本机模型代理处理失败，请重启服务后重试。',code,attempts:error.attempts||1,requestId});
    }
   }
   if(req.method!=='GET')return send(405,{error:'不支持的请求'});
   const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/engine.js':'engine.js'};
   const file=files[req.url?.split('?')[0]];if(!file)return send(404,{error:'未找到页面'});
   res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]+'; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(await readFile(resolve(root,file)));
  } catch {send(400,{error:'请求数据格式无效，请刷新页面后重试。',code:'INVALID_REQUEST'});}
 });
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const port=Number(process.env.PORT||43170); const server=makeServer();
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已被占用。可先尝试打开 http://127.0.0.1:${port}；或设置 PORT 后重启。`:e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Yacht Dice ready: http://127.0.0.1:${port}`));
}
