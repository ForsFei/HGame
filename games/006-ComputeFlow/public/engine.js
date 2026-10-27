export const NODES=[
 {id:'worker',name:'工作线程',code:'worker-01',cost:10,growth:1.15,output:1,tag:'基础执行单元'},
 {id:'queue',name:'消息队列',code:'queue-02',cost:120,growth:1.16,output:6,tag:'削峰与解耦'},
 {id:'index',name:'倒排索引',code:'index-03',cost:1500,growth:1.17,output:32,tag:'检索加速'},
 {id:'cache',name:'分布式缓存',code:'cache-04',cost:18000,growth:1.18,output:170,tag:'热点驻留'},
 {id:'shard',name:'分片集群',code:'shard-05',cost:110000,growth:1.19,output:1300,tag:'横向拆分'},
 {id:'gpu',name:'推理节点',code:'gpu-06',cost:1.3e6,growth:1.2,output:8000,tag:'批量计算'},
 {id:'quantum',name:'量子单元',code:'quantum-07',cost:1.2e7,growth:1.21,output:45000,tag:'实验性扩容'},
 {id:'grid',name:'算力网格',code:'grid-08',cost:1.4e8,growth:1.22,output:260000,tag:'全局调度'}];
export const NODE_INDEX=new Map(NODES.map(node=>[node.id,node]));
export const MILESTONE=10,MILESTONE_BONUS=0.25;
export class RuleError extends Error{constructor(code){super(code);this.code=code;}}
export function costOf(node,count){return Math.ceil(node.cost*Math.pow(node.growth,Math.max(0,count)));}
export function milestoneOf(count){return Math.floor(Math.max(0,count)/MILESTONE);}
export function unitOutput(node,count){return node.output*(1+milestoneOf(count)*MILESTONE_BONUS);}
export function nodeRate(state,id){
 const node=NODE_INDEX.get(id),count=state.counts[id]||0;
 return count?count*unitOutput(node,count):0;
}
export function rateOf(state){
 let total=0;
 for(const node of NODES){const count=state.counts[node.id]||0;if(count)total+=count*unitOutput(node,count);}
 return total;
}
export function nodeCost(state,id){const node=NODE_INDEX.get(id);return costOf(node,state.counts[id]||0);}
export function createGame(now=Date.now()){
 const counts={};
 for(const node of NODES)counts[node.id]=0;
 counts.worker=2;
 return {version:1,id:crypto.randomUUID(),counts,credits:25,auto:false,totalEarned:0,startedAt:new Date(now).toISOString(),lastSeen:now};
}
export function buy(state,id){
 const node=NODE_INDEX.get(id);
 if(!node)throw new RuleError('node');
 const count=state.counts[id]||0,cost=costOf(node,count);
 if(!Number.isFinite(state.credits)||state.credits<cost)throw new RuleError('funds');
 state.credits-=cost;
 state.counts[id]=count+1;
 return {cost,count:count+1};
}
export function tick(state,now=Date.now(),efficiency=1){
 const elapsed=Math.max(0,(now-state.lastSeen)/1000);
 state.lastSeen=now;
 if(elapsed<=0||efficiency<=0)return 0;
 const gain=rateOf(state)*elapsed*efficiency;
 state.credits+=gain;
 state.totalEarned+=gain;
 return gain;
}
export function settle(state,now=Date.now(),{capHours=8,efficiency=0.5}={}){
 const elapsed=Math.max(0,(now-state.lastSeen)/1000);
 const applied=Math.min(elapsed,capHours*3600);
 const gain=rateOf(state)*applied*efficiency;
 state.credits+=gain;
 state.totalEarned+=gain;
 state.lastSeen=now;
 return {elapsed,gain,applied};
}
export function autoBuy(state,limit=80){
 let bought=0;
 for(let guard=0;guard<limit;guard++){
  let best=null,bestCost=Infinity;
  for(const node of NODES){
   const cost=costOf(node,state.counts[node.id]||0);
   if(cost<=state.credits&&cost<bestCost){bestCost=cost;best=node;}
  }
  if(!best)break;
  buy(state,best.id);
  bought++;
 }
 return bought;
}
export function nextGoal(state){
 let best=null,bestCost=Infinity;
 for(const node of NODES){
  const count=state.counts[node.id]||0;
  if(count===0){const cost=costOf(node,0);if(cost<bestCost){bestCost=cost;best=node;}}
 }
 if(!best)return null;
 return {id:best.id,name:best.name,code:best.code,cost:bestCost};
}
export function validSave(state,now=Date.now()){
 if(!state||state.version!==1||typeof state.id!=='string'||!state.id)return false;
 if(!state.counts||typeof state.counts!=='object')return false;
 for(const node of NODES){
  const count=state.counts[node.id];
  if(!Number.isInteger(count)||count<0||count>1e6)return false;
 }
 if(!Number.isFinite(state.credits)||state.credits<0)return false;
 if(!Number.isFinite(state.totalEarned)||state.totalEarned<0)return false;
 if(typeof state.auto!=='boolean')return false;
 if(!Number.isFinite(Date.parse(state.startedAt)))return false;
 if(!Number.isFinite(state.lastSeen)||state.lastSeen>now+6e4)return false;
 return true;
}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function dayKey(ms=Date.now()){return new Date(ms+288e5).toISOString().slice(0,10).replaceAll('-','');}
export function format(value){
 if(!Number.isFinite(value))return '0';
 if(value<1000)return value<10?value.toFixed(1).replace(/\.0$/,''):Math.floor(value).toString();
 const units=['K','M','B','T','P','E'];
 let tier=-1,scaled=value;
 while(scaled>=1000&&tier<units.length-1){scaled/=1000;tier++;}
 return `${scaled>=100?scaled.toFixed(0):scaled>=10?scaled.toFixed(1):scaled.toFixed(2)}${units[tier]}`;
}
