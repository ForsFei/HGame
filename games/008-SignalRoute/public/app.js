import {setupQuiet} from './quiet.js';
import {LEVELS,levelOf,createGame,turn,step,reach,openEnds,elapsedSeconds,validSave,recordResult,validRecord,summarize} from './engine.js';
const $=id=>document.getElementById(id);
const DIRS=['n','e','s','w'];
const COPY={
 standard:{eyebrow:'ROUTE. ALIGN. CONNECT.',title:'信号路由',subtitle:'旋转线路，把每个节点接回网关。',view:'简洁模式',help:'玩法说明',newGame:'新的一局',movesLabel:'步数',timerLabel:'用时',levelTitle:'线路规模',levelTag:'LEVEL',levelHint:'规模越大节点越多。左键顺时针、右键逆时针旋转；每块线路的接口必须与相邻线路对上，全部接通才算完成。',recordsTitle:'最佳成绩',recordsTag:'BEST',recordsHint:'每档只记最好的一次：用时优先，步数作参考。',hintTitle:'怎么接线',hintTag:'RULE',hintText:'灰色是还没接通的线路，接通后变成青色；橙色是悬空的断口。带方点的是网关，不能旋转。',footer:'信号路由 · 离线单人 · 原创规则与界面',footerTag:'自动保存 · Alt+M',helpTitle:'玩法说明',newTitle:'开始新的一局？',newHint:'当前进度会被覆盖。',cancelNew:'继续当前进度',confirmNew:'确认新建',next:'再来一局',ready:'点击任意线路旋转，把所有节点接回网关。',playing:'已接通 {live}/{total} 个节点，还有 {ends} 处断口。',won:'链路已全部接通。',timeLabel:'用时',steps:'步'},
 quiet:{eyebrow:'LINK AUDIT / LOCAL JOB',title:'链路巡检',subtitle:'按拓扑翻转接线，把每个节点接回网关。',view:'标准视图',help:'手册',newGame:'新建巡检',movesLabel:'翻转次数',timerLabel:'耗时',levelTitle:'巡检范围',levelTag:'SCOPE',levelHint:'范围越大节点越多。左键顺时针、右键逆时针翻转；每个接口都要与相邻接口对上，全部接通才算完成。',recordsTitle:'最短耗时',recordsTag:'BEST',recordsHint:'每档只记一条最短记录：耗时优先，翻转次数作参考。',hintTitle:'读数约定',hintTag:'SPEC',hintText:'灰色是未接通的链路，接通后转为蓝色；橙色是悬空接口。带方点的是网关，不可翻转。',footer:'本地巡检工具 · 单人 · 不联网',footerTag:'自动快照 · Alt+M',helpTitle:'手册',newTitle:'新建巡检任务？',newHint:'当前任务的快照将被覆盖。',cancelNew:'保留当前任务',confirmNew:'确认新建',next:'再巡检一次',ready:'点击任一线路翻转，把每个节点接回网关。',playing:'已连通 {live}/{total}，待修断口 {ends} 处。',won:'链路已全部接通。',timeLabel:'耗时',steps:'次'}};
let state=null,records=[],pressTimer=0,longPressed=false,longPressAt=0,pressIndex=null,pendingLevel=null,focusIndex=null;
try{const saved=JSON.parse(localStorage.getItem('signalroute-save'));if(validSave(saved))state=saved;}catch{}
state??=createGame(LEVELS[0]);
try{const saved=JSON.parse(localStorage.getItem('signalroute-records'));if(Array.isArray(saved))records=saved.filter(validRecord).slice(0,50);}catch{}
const quietView=setupQuiet({key:'signalroute-view',standardTitle:'信号路由 · HGame',quietTitle:'链路巡检 · 本地',onApply:()=>render()});
const text=key=>COPY[quietView.quiet?'quiet':'standard'][key];
const clock=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const fill=(template,values)=>template.replace(/\{(\w+)\}/g,(all,key)=>key in values?String(values[key]):all);
function save(){try{localStorage.setItem('signalroute-save',JSON.stringify(state));}catch{}}
function saveRecords(){try{localStorage.setItem('signalroute-records',JSON.stringify(records));}catch{}}
function tileHTML(index,live){
 const mask=state.tiles[index];
 let parts='';
 for(let dir=0;dir<4;dir++){
  if(!(mask&(1<<dir)))continue;
  const near=step(index,dir,state.size);
  const leak=live[index]&&(near<0||!(state.tiles[near]&(1<<((dir+2)%4))));
  parts+=`<i class="pipe ${DIRS[dir]}${leak?' leak':''}"></i>`;
 }
 const cls=`tile${state.locked[index]?' locked':''}${live[index]?' live':''}`;
 return `<div class="${cls}" data-i="${index}" role="button" tabindex="0" aria-label="线路 ${index+1}">${parts}<i class="hub"></i></div>`;
}
function sample(dirs,cls='',leak=''){
 return `<div class="tile ${cls}">${dirs.map(dir=>`<i class="pipe ${dir}${dir===leak?' leak':''}"></i>`).join('')}<i class="hub"></i></div>`;
}
function render(){
 const quiet=quietView.quiet;
 document.documentElement.dataset.view=quiet?'quiet':'standard';
 for(const key of ['eyebrow','title','subtitle','view','help','newGame','movesLabel','timerLabel','levelTitle','levelTag','levelHint','recordsTitle','recordsTag','recordsHint','hintTitle','hintTag','hintText','footer','footerTag','helpTitle','newTitle','newHint','cancelNew','confirmNew'])$(key).textContent=text(key);
 $('brand').innerHTML=quiet?'LOCAL SESSION':'H▧GAME <span>/ 008</span>';
 const total=state.size*state.size,live=reach(state.tiles,state.size,0),won=state.status==='won';
 $('moves').textContent=String(state.moves);
 $('timer').textContent=clock(elapsedSeconds(state));
 $('board').dataset.size=state.size;
 $('board').style.gridTemplateColumns=`repeat(${state.size},var(--cell))`;
 $('board').innerHTML=state.tiles.map((mask,index)=>tileHTML(index,live)).join('');
 $('notice').textContent=won?text('won'):fill(text(state.status==='ready'?'ready':'playing'),{live:live.filter(Boolean).length,total,ends:openEnds(state.tiles,state.size)});
 $('levels').innerHTML=LEVELS.map(item=>`<button data-level="${item.id}" class="${item.id===state.level?'active':''}">${quiet?item.quiet:item.name}<small>${item.size} × ${item.size}</small></button>`).join('');
 const stats=summarize(records);
 $('records').innerHTML=LEVELS.map(item=>{const best=stats.bestTime[item.id],moves=stats.bestMoves[item.id];return `<div class="record"><span>${quiet?item.quiet:item.name}</span><b>${best===null?'—':clock(best)}</b><small>${moves===null?'—':`${moves} ${text('steps')}`}</small></div>`;}).join('');
 $('legend').innerHTML=quiet
  ?`<div class="legend-row">${sample(['n','s'],'live')}<p><b>已连通</b><span>两端接口都对接成功</span></p></div><div class="legend-row">${sample(['n','e'])}<p><b>未连通</b><span>点击顺时针翻转，右键逆时针</span></p></div><div class="legend-row">${sample(['n','e'],'','n')}<p><b>悬空接口</b><span>橙色表示这一端没有对上</span></p></div>`
  :`<div class="legend-row">${sample(['n','s'],'live')}<p><b>已接通</b><span>两端接口都对接成功</span></p></div><div class="legend-row">${sample(['n','e'])}<p><b>未接通</b><span>左键顺时针旋转，右键逆时针</span></p></div><div class="legend-row">${sample(['n','e'],'','n')}<p><b>断口</b><span>橙色表示这一端悬空</span></p></div>`;
 $('result').hidden=!won;
 if(won){
  $('resultTitle').textContent=quiet?'巡检完成':'链路接通';
  $('resultText').textContent=`${text('won')} ${text('timeLabel')} ${clock(elapsedSeconds(state))} · ${state.moves} ${text('steps')}。`;
 }
 $('next').textContent=text('next');
 $('newGame').textContent=text('newGame');
 if(focusIndex!==null){
  const tile=$('board').querySelector(`[data-i="${focusIndex}"]`);
  if(tile)tile.focus({preventScroll:true});
 }
}
function rotateAt(index,direction){
 let moved=false;
 try{moved=turn(state,index,direction);}catch{return;}
 if(!moved)return;
 if(state.status==='won'){records=recordResult(records,state);saveRecords();}
 save();render();
}
function startGame(level){
 state=createGame(level);
 pendingLevel=null;
 focusIndex=null;
 save();render();
}
function requestLevel(id){
 const level=LEVELS.find(item=>item.id===id);
 if(!level||level.id===state.level&&state.status==='ready')return;
 if(state.status==='playing'){pendingLevel=id;$('newDialog').showModal();return;}
 startGame(level);
}
$('view').onclick=()=>quietView.toggle();
$('board').addEventListener('contextmenu',event=>{
 event.preventDefault();
 if(Date.now()-longPressAt<700)return;
 const tile=event.target.closest('[data-i]');
 if(tile)rotateAt(Number(tile.dataset.i),-1);
});
$('board').addEventListener('pointerdown',event=>{
 if(event.button===2)return;
 const tile=event.target.closest('[data-i]');
 if(!tile)return;
 event.preventDefault();
 pressIndex=Number(tile.dataset.i);
 longPressed=false;
 clearTimeout(pressTimer);
 if(event.pointerType==='mouse')return;
 pressTimer=setTimeout(()=>{
  longPressed=true;
  longPressAt=Date.now();
  if(pressIndex!==null)rotateAt(pressIndex,-1);
 },450);
});
$('board').addEventListener('pointerup',event=>{
 clearTimeout(pressTimer);
 const index=pressIndex;
 pressIndex=null;
 if(longPressed||index===null)return;
 const tile=event.target.closest('[data-i]');
 if(tile&&Number(tile.dataset.i)===index)rotateAt(index,1);
});
$('board').addEventListener('pointercancel',()=>{clearTimeout(pressTimer);longPressed=false;pressIndex=null;});
$('board').addEventListener('keydown',event=>{
 if(event.key!=='Enter'&&event.key!==' ')return;
 const tile=event.target.closest('[data-i]');
 if(!tile)return;
 event.preventDefault();
 focusIndex=Number(tile.dataset.i);
 rotateAt(focusIndex,event.shiftKey?-1:1);
});
$('levels').onclick=event=>{const button=event.target.closest('[data-level]');if(button)requestLevel(button.dataset.level);};
$('newGame').onclick=()=>{
 if(state.status==='playing'){pendingLevel=state.level;$('newDialog').showModal();return;}
 startGame(levelOf(state.size));
};
$('cancelNew').onclick=()=>{$('newDialog').close();pendingLevel=null;};
$('confirmNew').onclick=()=>{
 const id=pendingLevel;
 $('newDialog').close();
 pendingLevel=null;
 startGame(LEVELS.find(item=>item.id===id)||levelOf(state.size));
};
$('next').onclick=()=>startGame(levelOf(state.size));
$('help').onclick=()=>{
 $('helpTitle').textContent=text('helpTitle');
 $('helpContent').innerHTML=quietView.quiet
  ?'<p>链路矩阵里有若干接口需要对齐，靠翻转每格线路把所有节点接回网关。</p><ol><li>左键点击线路：顺时针翻转 90 度。</li><li>右键或长按：逆时针翻转 90 度。</li><li>灰色是未连通链路，接通后变蓝；橙色是悬空接口。</li><li>每格的接口都要与相邻格对上，全盘没有断口且连成一片才算完成。</li><li>带方点的网关格不可翻转，可以作为对位参照。</li></ol><p>进度自动保存，刷新可继续。切换范围会新建一次巡检。</p>'
  :'<p>棋盘里是一张被打散的管网，靠旋转每块线路把所有节点接回网关。</p><ol><li>左键点击线路：顺时针旋转 90 度。</li><li>右键或长按：逆时针旋转 90 度。</li><li>灰色是还没接通的线路，接通后变青色；橙色是悬空的断口。</li><li>每块线路的接口都要与相邻线路对上，全盘没有断口且连成一片才算完成。</li><li>带方点的网关格不能旋转，可以作为对位参照。</li></ol><p>进度自动保存，刷新可以继续。切换范围会开新的一局。</p>';
 $('helpDialog').showModal();
};
$('closeHelp').onclick=()=>$('helpDialog').close();
setInterval(()=>{if(state.status==='playing')$('timer').textContent=clock(elapsedSeconds(state));},500);
render();
