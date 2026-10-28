import {RocoWorker} from './bridge.mjs';
import {requestRocoDecision} from './model-api.mjs';

export function createRocoApi(options={}){
 const worker=new RocoWorker(),locks=new Set();let catalog;
 return {close:()=>worker.close(),async handle(req,res,operation){
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  let locked;
  try{
   if(operation==='catalog'&&req.method==='GET'){catalog??=worker.call('catalog').catch(e=>{catalog=undefined;throw e;});return send(200,await catalog);}
   if(req.method!=='POST')return send(405,{error:'不支持的请求'});
   if(!['create','get','step','calculate'].includes(operation))return send(404,{error:'未找到接口'});
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>100000)return send(413,{error:'请求过大'});}
   let data;try{data=JSON.parse(body);}catch{return send(400,{error:'请求 JSON 无效'});}
   if(!data||typeof data!=='object'||Array.isArray(data))return send(400,{error:'请求格式无效'});
   if(operation!=='step')return send(200,await worker.call(operation,data));
   if(typeof data.id!=='string'||locks.has(data.id))return send(409,{error:'该对局正在处理，请稍后同步'});
   locks.add(data.id);locked=data.id;
   const current=await worker.call('get',{id:data.id});
   if(current.version!==data.version||current.winner)return send(409,{error:'回合已变化或结束，请同步对局'});
   const side=data.side??'a';
   if(!['a','b'].includes(side)||(side==='b'&&current.mode!=='local')||current.pending.includes(side))return send(400,{error:'当前控制侧无效或已提交'});
   if(!Array.isArray(data.action)||!data.action.every(Number.isInteger)||!current.actions[side].some(a=>JSON.stringify(a.id)===JSON.stringify(data.action)))return send(400,{error:'动作不可用，请同步当前回合'});
   let decision;
   if(current.mode==='model'&&!data.fallback){
    const context=await worker.call('context',{id:data.id});
    decision=await requestRocoDecision(data.config,context,options);
   }
   const result=await worker.call('step',{id:data.id,version:data.version,side,action:data.action,fallback:data.fallback===true,modelAction:decision?.action});
   return send(200,{...result,...(decision?{modelDecision:decision}:{})});
  }catch(error){return send(400,{error:error.message||'本地规则处理失败'});}
  finally{if(locked)locks.delete(locked);}
 }};
}
