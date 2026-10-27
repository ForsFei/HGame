import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {GAMES,gameUrl} from './library/catalog.js';
import {makeServer} from './games/001-YachtDice/server.mjs';

const root=fileURLToPath(new URL('./',import.meta.url)),common=['index.html','app.js','engine.js','style.css'];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
export function createLibraryServer({modelOptions={}}={}){
 const yacht=makeServer(modelOptions);
 return http.createServer(async(req,res)=>{
  const send=(status,data,type='text/plain')=>{res.writeHead(status,{'Content-Type':`${type}; charset=utf-8`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:data);};
  try{
   if(!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host||''))return send(403,'仅允许本机访问');
   const expected=`http://${req.headers.host}`;
   if(req.headers.origin&&req.headers.origin!==expected)return send(403,'请求来源不匹配');
   const url=new URL(req.url,expected),path=url.pathname;
   if(req.headers.host.startsWith('localhost:')&&['GET','HEAD'].includes(req.method)){res.writeHead(308,{Location:`http://127.0.0.1:${url.port}${path}${url.search}`});res.end();return;}
   if(path==='/api/decision'||path==='/games/yacht-dice/api/decision'){req.url='/api/decision';yacht.emit('request',req,res);return;}
   if(!['GET','HEAD'].includes(req.method))return send(405,'不支持的请求');
   if(path==='/api/library')return send(200,JSON.stringify({app:'hgame-library',version:1,port:Number(url.port),games:GAMES.map(({files,...g})=>({...g,url:gameUrl(g.id)}))}),'application/json');
   let file;
   if(path==='/')file=resolve(root,'library/index.html');
   else if(/^\/library\/(app\.js|style\.css|catalog\.js|game-shell\.js)$/.test(path))file=resolve(root,path.slice(1));
   else if(/^\/shared\/quiet\.(js|css)$/.test(path))file=resolve(root,path.slice(1));
   else{
    const match=/^\/games\/([a-z0-9-]+)(?:\/(.*))?$/.exec(path),game=match&&GAMES.find(g=>g.id===match[1]);
    if(!game)return send(404,'未找到页面，请返回游戏库 /');
    if(match[2]===undefined){res.writeHead(308,{Location:`${gameUrl(game.id)}${url.search}`});res.end();return;}
    const name=match[2]||'index.html';if(![...common,...game.files].includes(name))return send(404,'未找到文件');
    file=resolve(root,'games',game.folder,'public',name);
   }
   let data=await readFile(file);
   if(file.endsWith('index.html')&&file!==resolve(root,'library/index.html'))data=Buffer.from(data.toString().replace('</head>','<script defer src="/library/game-shell.js"></script></head>'));
   send(200,data,types[extname(file)]||'text/plain');
  }catch(e){send(e.code==='ENOENT'?404:500,e.code==='ENOENT'?'未找到文件':'服务读取失败，请检查本地文件');}
 });
}
export function startLibrary({game,port}={}){
 const args=process.argv.slice(2),option=name=>{const n=args.indexOf(name);return n<0?undefined:args[n+1];};
 port=Number(port??option('--port')??process.env.PORT??43170);game??=option('--game');
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('端口需为 1–65535 的整数');
 if(game&&!GAMES.some(g=>g.id===game))throw Error('游戏编号无效');
 const server=createLibraryServer();
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已占用。已有游戏库可直接打开；否则请关闭旧服务或设置 PORT。`:e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`HGame Library: http://127.0.0.1:${port}${game?gameUrl(game):'/'}\n十个游戏共用一个服务。关闭此窗口停止游戏库。`));
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))startLibrary();
