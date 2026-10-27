import {mkdir,appendFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

export function redactTrace(value,key){
 if(typeof value==='string')return key?value.split(key).join('[REDACTED]').split(JSON.stringify(key).slice(1,-1)).join('[REDACTED]'):value;
 if(Array.isArray(value))return value.map(v=>redactTrace(v,key));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/^(authorization|api[_-]?key|access_token|refresh_token|password)$/i.test(k)?'[REDACTED]':redactTrace(v,key)]));
 return value;
}
export function createTraceLogger(directory=fileURLToPath(new URL('./logs/',import.meta.url))){
 let queue=Promise.resolve();
 return event=>{
  const time=new Date(event.timestamp||Date.now());
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(time);
  const part=type=>parts.find(p=>p.type===type).value;
  const filename=`model-api-${part('year')}-${part('month')}-${part('day')}.jsonl`;
  const line=JSON.stringify(event)+'\n';
  const write=queue.then(async()=>{await mkdir(directory,{recursive:true});await appendFile(join(directory,filename),line,'utf8');});
  queue=write.catch(()=>{});
  return write;
 };
}
