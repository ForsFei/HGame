import {setupQuiet} from './quiet.js';
import {LEVELS,levelById,createGame,move,undo,restart,elapsedSeconds,validSave,recordResult,validRecord,summarize} from './engine.js';
const $=id=>document.getElementById(id);
const COPY={
 standard:{eyebrow:'PUSH. PARK. CLEAR.',title:'托盘上架',subtitle:'把每个托盘推进标记的库位，箱子只能推不能拉。',view:'简洁模式',help:'玩法说明',reset:'重开本关',movesLabel:'步数',pushesLabel:'推动',timerLabel:'用时',levelTitle:'关卡',levelTag:'LEVEL',undo:'撤销',retry:'重开本关',recordsTitle:'最佳成绩',recordsTag:'BEST',hintTitle:'怎么推箱',hintTag:'RULE',hintText:'深色块是墙，虚线方框是库位，橙色托盘要推进去。方向键或 WASD 移动，Z 撤销，R 重开本关。',footer:'托盘上架 · 离线单人 · 原创规则与界面',footerTag:'方向键移动 · Z 撤销 · Alt+M',helpTitle:'玩法说明',newTitle:'切换关卡？',newHint:'当前进度会被覆盖。',cancelNew:'继续当前关卡',confirmNew:'确认切换',next:'下一关',progressLine:'已通过 {cleared}/{total} 关',bestMovesTotal:'最佳步数合计',bestTimeLabel:'最快通关',ready:'用方向键或下面的方向按钮移动；托盘只能推，不能拉。',playing:'参考最少 {par} 步，你已经走了 {moves} 步、推开 {pushes} 次。',won:'全部托盘已上架。',timeLabel:'用时',steps:'步',pushes:'次',parLabel:'参考最少',best:'最好',standard:'标准',lastLevel:'回到第 1 关'},
 quiet:{eyebrow:'PARK. TALLY. DONE.',title:'库位归位',subtitle:'按库位标记搬运料箱，全部归位即完成盘点。',view:'标准视图',help:'手册',reset:'重置本批',movesLabel:'移动格数',pushesLabel:'搬运次数',timerLabel:'耗时',levelTitle:'批次',levelTag:'SCOPE',undo:'撤回',retry:'重置本批',recordsTitle:'最短耗时',recordsTag:'BEST',hintTitle:'读数约定',hintTag:'SPEC',hintText:'深色块为货架，虚线框为库位，橙色料箱需推入库位。方向键或 WASD 移动，Z 撤回，R 重置本批。',footer:'本地盘点工具 · 单人 · 不联网',footerTag:'方向键移动 · Z 撤回 · Alt+M',helpTitle:'手册',newTitle:'切换批次？',newHint:'当前批次的快照将被覆盖。',cancelNew:'保留当前批次',confirmNew:'确认切换',next:'下一批',progressLine:'已归位 {cleared}/{total} 批',bestMovesTotal:'最少移动合计',bestTimeLabel:'最短耗时',ready:'用方向键或下方按钮移动；料箱只能推，不能拉。',playing:'标准工时 {par} 格，当前已移动 {moves} 格、搬运 {pushes} 次。',won:'全部料箱已归位。',timeLabel:'耗时',steps:'格',pushes:'次',parLabel:'标准工时',best:'最少',standard:'标准',lastLevel:'回到批次 1'}};
let state=null,records=[],pendingLevel=null;
try{const saved=JSON.parse(localStorage.getItem('crateshift-save'));if(validSave(saved))state=saved;}catch{}
state??=createGame(LEVELS[0]);
try{const saved=JSON.parse(localStorage.getItem('crateshift-records'));if(Array.isArray(saved))records=saved.filter(validRecord).slice(0,50);}catch{}
const quietView=setupQuiet({key:'crateshift-view',standardTitle:'托盘上架 · HGame',quietTitle:'库位归位 · 本地',onApply:()=>render()});
const text=key=>COPY[quietView.quiet?'quiet':'standard'][key];
const clock=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const fill=(template,values)=>template.replace(/\{(\w+)\}/g,(all,key)=>key in values?String(values[key]):all);
function save(){try{localStorage.setItem('crateshift-save',JSON.stringify(state));}catch{}}
function saveRecords(){try{localStorage.setItem('crateshift-records',JSON.stringify(records));}catch{}}
function boardHTML(){
 const parts=[];
 for(let index=0;index<state.w*state.h;index++){
  const wall=state.walls.includes(index);
  const goal=state.goals.includes(index);
  const box=state.boxes.includes(index);
  const me=state.player===index;
  let cls='cell '+(wall?'wall':'floor');
  if(goal&&!wall)cls+=' goal';
  if(box)cls+=goal?' box done':' box';
  if(me)cls+=' me';
  parts.push(`<div class="${cls}" data-i="${index}"></div>`);
 }
 return parts.join('');
}
function sample(cls){return `<div class="cell ${cls}"></div>`;}
function helpHTML(){
 return quietView.quiet
  ?'<p>仓库里散放着若干料箱，需要把它们全部推到虚线标记的库位上。</p><ol><li>方向键或 WASD 移动搬运员，也可以点下面的方向按钮。</li><li>料箱只能推不能拉：走到料箱旁边再往同方向移动即可推动。</li><li>料箱被推到墙或其他料箱上就推不动了，注意不要把它顶进死角。</li><li>Z 撤回上一步，R 重置本批，次数不限。</li><li>全部料箱进入库位即完成，顶部记录移动格数、搬运次数与耗时。</li></ol><p>进度自动保存，刷新可继续。切换批次会新建一次盘点任务。</p>'
  :'<p>仓库里散放着若干托盘，需要把它们全部推到虚线标记的库位上。</p><ol><li>方向键或 WASD 移动，也可以点下面的方向按钮。</li><li>托盘只能推不能拉：走到托盘旁边再往同方向移动即可推动。</li><li>托盘被推到墙或另一个托盘上就推不动了，注意别把它顶进死角。</li><li>Z 撤销上一步，R 重开本关，次数不限。</li><li>全部托盘进入库位即完成，顶部记录步数、推动次数与用时。</li></ol><p>进度自动保存，刷新可以继续。切换关卡会开新的一局。</p>';
}
function render(){
 const quiet=quietView.quiet,level=levelById(state.level);
 document.documentElement.dataset.view=quiet?'quiet':'standard';
 for(const key of ['eyebrow','title','subtitle','view','help','reset','movesLabel','pushesLabel','timerLabel','levelTitle','levelTag','undo','retry','recordsTitle','recordsTag','hintTitle','hintTag','hintText','footer','footerTag','helpTitle','newTitle','newHint','cancelNew','confirmNew'])$(key).textContent=text(key);
 $('brand').innerHTML=quiet?'LOCAL SESSION':'H▧GAME <span>/ 010</span>';
 $('moves').textContent=String(state.moves);
 $('pushes').textContent=String(state.pushes);
 $('timer').textContent=clock(elapsedSeconds(state));
 $('board').dataset.w=state.w;
 $('board').style.gridTemplateColumns=`repeat(${state.w},var(--cell))`;
 $('board').innerHTML=boardHTML();
 const won=state.status==='won';
 $('notice').textContent=won?text('won'):fill(text(state.status==='ready'?'ready':'playing'),{par:state.par,moves:state.moves,pushes:state.pushes});
 $('undo').disabled=state.history.length===0;
 const stats=summarize(records);
 const sumBest=LEVELS.reduce((total,item)=>total+(stats.bestMoves[item.id]??0),0);
 const fastest=LEVELS.map(item=>stats.bestTime[item.id]).filter(value=>value!==null);
 $('progress').textContent=fill(text('progressLine'),{cleared:stats.cleared,total:LEVELS.length});
 $('records').innerHTML=`
  <div class="record"><span>${text('bestMovesTotal')}</span><b>${sumBest?`${sumBest} ${text('steps')}`:'—'}</b><small></small></div>
  <div class="record"><span>${text('bestTimeLabel')}</span><b>${fastest.length?clock(Math.min(...fastest)):'—'}</b><small></small></div>`;
 $('levels').innerHTML=LEVELS.map((item,index)=>{
  const best=stats.bestMoves[item.id];
  return `<button data-level="${item.id}" class="${item.id===state.level?'active':''}${best!==null?' done':''}">${quiet?item.quiet:item.name}<small>${text('parLabel')} ${item.par} ${text('steps')} · ${text('best')} ${best===null?'—':`${best} ${text('steps')}`}</small></button>`;
 }).join('');
 $('legend').innerHTML=quiet
  ?`<div class="legend-row">${sample('floor')}<p><b>通道</b><span>可以走动的货架间隙</span></p></div><div class="legend-row">${sample('wall')}<p><b>货架</b><span>不可通过，也不可堆放</span></p></div><div class="legend-row">${sample('floor goal')}<p><b>库位</b><span>料箱要推到这里</span></p></div><div class="legend-row">${sample('floor box')}<p><b>料箱</b><span>只能推不能拉</span></p></div><div class="legend-row">${sample('floor goal box done')}<p><b>已归位</b><span>料箱已在库位上</span></p></div><div class="legend-row">${sample('floor me')}<p><b>搬运员</b><span>你自己的位置</span></p></div>`
  :`<div class="legend-row">${sample('floor')}<p><b>地面</b><span>可以走动的地砖</span></p></div><div class="legend-row">${sample('wall')}<p><b>墙</b><span>不可通过，也不能推箱</span></p></div><div class="legend-row">${sample('floor goal')}<p><b>库位</b><span>托盘要推到这里</span></p></div><div class="legend-row">${sample('floor box')}<p><b>托盘</b><span>只能推，不能拉</span></p></div><div class="legend-row">${sample('floor goal box done')}<p><b>已上架</b><span>托盘已经在库位上</span></p></div><div class="legend-row">${sample('floor me')}<p><b>你</b><span>当前位置</span></p></div>`;
 $('result').hidden=!won;
 if(won){
  $('resultTitle').textContent=quiet?'归位完成':'上架完成';
  $('resultText').textContent=`${text('won')} ${text('timeLabel')} ${clock(elapsedSeconds(state))} · ${state.moves} ${text('steps')} · ${text('pushesLabel')} ${state.pushes} ${text('pushes')}（${text('parLabel')} ${state.par} ${text('steps')}）。`;
  const last=LEVELS[LEVELS.length-1].id===state.level;
  $('next').textContent=last?text('lastLevel'):text('next');
 }
 if($('helpDialog').open){$('helpTitle').textContent=text('helpTitle');$('helpContent').innerHTML=helpHTML();}
}
function tryMove(dx,dy){
 let result;
 try{result=move(state,dx,dy);}catch{return;}
 if(!result.moved)return;
 if(state.status==='won'){records=recordResult(records,state);saveRecords();}
 save();render();
}
function undoStep(){
 if(!undo(state))return;
 save();render();
}
function restartLevel(){
 restart(state);
 save();render();
}
function startLevel(level){
 state=createGame(level);
 pendingLevel=null;
 save();render();
}
function nextLevel(){
 const index=LEVELS.findIndex(item=>item.id===state.level);
 startLevel(LEVELS[(index+1)%LEVELS.length]);
}
function requestLevel(id){
 const level=levelById(id);
 if(!level||level.id===state.level&&state.moves===0)return;
 if(state.moves>0&&state.status==='playing'){pendingLevel=id;$('newDialog').showModal();return;}
 startLevel(level);
}
const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
$('view').onclick=()=>quietView.toggle();
$('pad').onclick=event=>{
 const button=event.target.closest('[data-dir]');
 if(!button)return;
 const [dx,dy]=DIRS[button.dataset.dir];
 tryMove(dx,dy);
};
$('undo').onclick=undoStep;
$('retry').onclick=restartLevel;
$('reset').onclick=restartLevel;
$('next').onclick=nextLevel;
$('levels').onclick=event=>{const button=event.target.closest('[data-level]');if(button)requestLevel(button.dataset.level);};
$('cancelNew').onclick=()=>{$('newDialog').close();pendingLevel=null;};
$('confirmNew').onclick=()=>{
 const id=pendingLevel;
 $('newDialog').close();
 pendingLevel=null;
 startLevel(levelById(id)||levelById(state.level)||LEVELS[0]);
};
$('help').onclick=()=>{
 $('helpTitle').textContent=text('helpTitle');
 $('helpContent').innerHTML=helpHTML();
 $('helpDialog').showModal();
};
$('closeHelp').onclick=()=>$('helpDialog').close();
document.addEventListener('keydown',event=>{
 if($('helpDialog').open||$('newDialog').open)return;
 const key=event.key.toLowerCase();
 if(key==='z'){undoStep();event.preventDefault();return;}
 if(key==='r'){restartLevel();event.preventDefault();return;}
 const map={arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right',w:'up',s:'down',a:'left',d:'right'};
 const dir=map[key];
 if(!dir)return;
 event.preventDefault();
 const [dx,dy]=DIRS[dir];
 tryMove(dx,dy);
});
setInterval(()=>{if(state.status==='playing')$('timer').textContent=clock(elapsedSeconds(state));},500);
render();
