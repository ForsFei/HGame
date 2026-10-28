import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';

export class RocoWorker {
 constructor(){this.child=null;this.pending=new Map();this.sequence=0;}
 start(){
  if(this.child)return;
  const executable=process.env.ROCO_PYTHON||'python';
  const child=spawn(executable,['-u','-B',fileURLToPath(new URL('./worker.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  this.child=child;
  const fail=message=>{if(this.child!==child)return;this.child=null;for(const {reject,timer} of this.pending.values()){clearTimeout(timer);reject(Error(message));}this.pending.clear();};
  child.on('error',()=>fail('无法启动规则引擎。请安装 Python 3.10+，或设置 ROCO_PYTHON 为 Python 路径。'));
  child.on('exit',()=>fail('规则引擎已停止，请重新创建对局。'));
  child.stdin.on('error',()=>fail('规则引擎连接已断开，请重新创建对局。'));
  // Upstream diagnostic output stays off the wire; only JSON lines reach callers.
  child.stderr.on('data',()=>{});
  createInterface({input:child.stdout}).on('line',line=>{
   let message;try{message=JSON.parse(line);}catch{return;}
   const pending=this.pending.get(message.id);if(!pending)return;
   this.pending.delete(message.id);clearTimeout(pending.timer);
   message.error?pending.reject(Error(message.error)):pending.resolve(message.result);
  });
 }
 call(command,data={}){
  this.start();const id=++this.sequence;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('规则计算超时，请重新创建对局。'));this.close();},30000);
   this.pending.set(id,{resolve,reject,timer});
   this.child.stdin.write(JSON.stringify({id,command,data})+'\n');
  });
 }
 close(){const child=this.child;if(child)child.kill();}
}
