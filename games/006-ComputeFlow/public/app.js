import {NODES,createGame,buy,rateOf,nodeRate,nodeCost,milestoneOf,tick,settle,autoBuy,nextGoal,validSave,format} from './engine.js';
const $=id=>document.getElementById(id);
const COPY={standard:{eyebrow:'ALLOCATE. EXPAND. REPEAT.',title:'算力调度站',subtitle:'把每一份算力派到该去的地方，让集群自己生长。',view:'简洁模式',help:'玩法说明',reset:'重置',creditsLabel:'总算力',rateLabel:'产出',colName:'节点',colCount:'数量',colRate:'产出',colCost:'扩容',goalTitle:'下一个目标',goalTag:'NEXT',statsTitle:'运行概况',statsTag:'LOCAL',hintTitle:'调度建议',hintTag:'TIP',hintText:'优先补齐尚未解锁的节点，它们的单位产出通常更高。同一节点每满 10 个，产出再 +25%，数量后面的倍率就是当前加成。',footer:'算力调度站 · 离线单人 · 原创规则与界面',footerTag:'自动保存 · Alt+M',helpTitle:'玩法说明',resetTitle:'清空当前集群？',resetHint:'会删除全部节点与算力，无法撤销。',cancelReset:'保留当前进度',confirmReset:'确认清空',autoOn:'自动扩容：开',autoOff:'自动扩容：关',total:'累计产出',online:'运行时长',nodes:'节点总数',goalDone:'全部节点已解锁，继续扩容提升吞吐。'},quiet:{eyebrow:'QUOTA / THROUGHPUT MONITOR',title:'配额监控',subtitle:'按实例统计吞吐，扩容最便宜的那一档。',view:'标准视图',help:'手册',reset:'清空配额',creditsLabel:'已用配额',rateLabel:'吞吐',colName:'资源',colCount:'副本',colRate:'吞吐',colCost:'操作',goalTitle:'待初始化',goalTag:'PENDING',statsTitle:'运行概况',statsTag:'LOCAL',hintTitle:'容量建议',hintTag:'TIP',hintText:'优先初始化尚未上线的实例，单位成本吞吐更高。同一实例每满 10 个副本，吞吐再 +25%，副本数后的倍率即当前系数。',footer:'本地配额监控 · 单人 · 不联网',footerTag:'自动快照 · Alt+M',helpTitle:'手册',resetTitle:'清空全部配额？',resetHint:'会删除所有实例与已用配额，不可撤销。',cancelReset:'保留当前数据',confirmReset:'确认清空',autoOn:'自动扩容：开',autoOff:'自动扩容：关',total:'累计吞吐',online:'运行时长',nodes:'实例总数',goalDone:'全部实例已上线，继续扩容提升吞吐。'}};
let state=null,quiet=document.documentElement.dataset.view==='quiet',noticeText='',offline=null,lastSave=0,lastAuto=0,lastLive=0;
try{const saved=JSON.parse(localStorage.getItem('computeflow-save'));if(validSave(saved))state=saved;}catch{}
const fresh=!state;
state??=createGame();
if(!fresh){offline=settle(state);if(offline.gain>0&&offline.elapsed>=60)noticeText=offlineLine(offline);}
const text=key=>COPY[quiet?'quiet':'standard'][key];
function duration(seconds){
 const total=Math.max(0,Math.floor(seconds)),hour=Math.floor(total/3600),minute=Math.floor(total%3600/60);
 if(quiet)return hour?`${hour}h ${minute}m`:`${minute}m`;
 return hour?`${hour} 小时 ${minute} 分`:`${minute} 分钟`;
}
function offlineLine(info){
 const capped=info.elapsed>info.applied+1;
 if(quiet)return `离线 ${duration(info.elapsed)}，补齐 +${format(info.gain)} 吞吐配额${capped?'（上限 8h）':''}。`;
 return `离线 ${duration(info.elapsed)}，补齐 +${format(info.gain)} 算力${capped?'（上限 8 小时）':''}。`;
}
function save(){try{localStorage.setItem('computeflow-save',JSON.stringify(state));}catch{}}
function nodeRow(node){
 const count=state.counts[node.id],cost=nodeCost(state,node.id),rate=nodeRate(state,node.id),tier=milestoneOf(count);
 const label=quiet?node.code:node.name,sub=quiet?node.tag:node.code;
 return `<div class="node${count?' owned':''}" data-id="${node.id}"><div class="node-name"><b>${label}</b><small>${sub}</small></div><div class="node-count">${count||'—'}${tier?`<em>×${(1+tier*0.25).toFixed(2)}</em>`:''}</div><div class="node-rate">${rate?format(rate)+'/s':'0'}</div><button class="buy" data-buy="${node.id}" ${state.credits>=cost?'':'disabled'}>+ ${format(cost)}</button></div>`;
}
function goalHTML(){
 const goal=nextGoal(state);
 if(!goal)return `<p class="goal-done">${text('goalDone')}</p>`;
 const percent=Math.min(100,state.credits/goal.cost*100);
 const ready=state.credits>=goal.cost;
 return `<div class="goal-name">${quiet?goal.code:goal.name}</div><div class="bar"><i style="width:${percent.toFixed(1)}%"></i></div>`+(ready?`<small class="goal-ready">${quiet?'配额已满足，可直接扩容。':'算力已够，可以直接扩容。'}</small>`:`<small>${format(state.credits)} / ${format(goal.cost)}</small>`);
}
function statsHTML(){
 const seconds=(Date.now()-Date.parse(state.startedAt))/1000;
 const total=NODES.reduce((sum,node)=>sum+state.counts[node.id],0);
 return `<div><small>${text('total')}</small><b>${format(state.totalEarned)}</b></div><div><small>${text('online')}</small><b>${duration(seconds)}</b></div><div><small>${text('nodes')}</small><b>${total}</b></div>`;
}
function updateLive(){
 $('credits').textContent=format(state.credits);
 $('rate').textContent=format(rateOf(state))+'/s';
 $('goal').innerHTML=goalHTML();
 $('stats').innerHTML=statsHTML();
 for(const node of NODES){
  const button=$('nodes').querySelector(`[data-buy="${node.id}"]`);
  if(button)button.disabled=state.credits<nodeCost(state,node.id);
 }
}
function render(){
 document.documentElement.dataset.view=quiet?'quiet':'standard';
 document.title=quiet?'配额监控 · 本地':'算力调度站 · HGame';
 for(const key of ['eyebrow','title','subtitle','view','help','reset','creditsLabel','rateLabel','colName','colCount','colRate','colCost','goalTitle','goalTag','statsTitle','statsTag','hintTitle','hintTag','hintText','footer','footerTag','helpTitle','resetTitle','resetHint','cancelReset','confirmReset'])$(key).textContent=text(key);
 $('brand').innerHTML=quiet?'LOCAL SESSION':'H▧GAME <span>/ 006</span>';
 $('autoButton').textContent=state.auto?text('autoOn'):text('autoOff');
 $('autoButton').setAttribute('aria-pressed',String(state.auto));
 $('notice').textContent=noticeText;
 $('nodes').innerHTML=NODES.map(nodeRow).join('');
 updateLive();
}
$('nodes').onclick=event=>{
 const button=event.target.closest('[data-buy]');
 if(!button)return;
 try{buy(state,button.dataset.buy);noticeText='';}
 catch{noticeText=quiet?'配额不足，无法扩容。':'算力还不够。';}
 save();render();
};
$('autoButton').onclick=()=>{state.auto=!state.auto;save();render();};
$('view').onclick=()=>{quiet=!quiet;try{localStorage.setItem('computeflow-view',quiet?'quiet':'standard');}catch{}render();};
$('reset').onclick=()=>$('resetDialog').showModal();
$('cancelReset').onclick=()=>$('resetDialog').close();
$('confirmReset').onclick=()=>{$('resetDialog').close();state=createGame();noticeText='';save();render();};
$('help').onclick=()=>{
 $('helpTitle').textContent=text('helpTitle');
 $('helpContent').innerHTML=quiet
  ?'<p>配额监控统计每个实例的吞吐。副本越多，吞吐越高；同一实例每满 10 个副本，吞吐再乘 1.25。</p><ol><li>点「扩容」消耗已有配额，增加一个副本。</li><li>新实例的初始成本更低，优先初始化通常比继续堆旧实例更快。</li><li>页面关闭后仍按 50% 效率累计，最多补 8 小时。</li><li>「自动扩容」会每秒自动扩容当前最便宜的一档。</li></ol><p>进度自动保存在本浏览器，清空配额会删除全部数据。</p>'
  :'<p>算力随时间是自动累积的，节点越多、倍数越高，产出越快。</p><ol><li>点「扩容」消耗算力，为该节点增加一个实例。</li><li>还没解锁的节点初始成本更低，优先补齐通常比一直堆同一个节点更快。</li><li>每个节点每满 10 个，自身产出 +25%，数量后面的倍率就是当前加成。</li><li>关闭页面后仍按 50% 效率继续累积，最多补 8 小时。</li><li>打开「自动扩容」后，会每秒自动买当前最便宜的一档。</li></ol><p>进度自动保存在本浏览器，重置会清空全部数据。</p>';
 $('helpDialog').showModal();
};
$('closeHelp').onclick=()=>$('helpDialog').close();
document.addEventListener('keydown',event=>{
 if(event.altKey&&event.code==='KeyM'&&!event.repeat){event.preventDefault();$('view').click();}
});
setInterval(()=>{
 const now=Date.now();
 tick(state,now);
 if(state.auto&&now-lastAuto>=1000){
  lastAuto=now;
  if(autoBuy(state,1)){
   lastSave=now;
   save();
   $('nodes').innerHTML=NODES.map(nodeRow).join('');
  }
 }
 if(now-lastLive>=250){lastLive=now;updateLive();}
 if(now-lastSave>=5000){lastSave=now;save();}
},200);
addEventListener('beforeunload',save);
render();
