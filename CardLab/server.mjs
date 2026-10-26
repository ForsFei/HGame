import http from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.PORT||43171);
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/engine.js':'engine.js','/records.js':'records.js','/recap.js':'recap.js','/style.css':'style.css'};
http.createServer(async(req,res)=>{
 const file=files[req.url.split('?')[0]];
 if(!file||req.method!=='GET'){res.writeHead(404);res.end('Not found');return;}
 try{const data=await readFile(new URL(`./public/${file}`,import.meta.url));res.writeHead(200,{'Content-Type':`${file.endsWith('html')?'text/html':file.endsWith('css')?'text/css':'text/javascript'}; charset=utf-8`,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(500);res.end('Read error');}
}).on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已占用，请设置 PORT 后重试。`:e.message);process.exitCode=1;}).listen(port,'127.0.0.1',()=>console.log(`CardLab: http://127.0.0.1:${port}`));
