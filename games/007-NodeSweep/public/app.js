import {setupQuiet} from '/shared/quiet.js';
import {LEVELS,cluesOf,createGame,reveal,toggleFlag,flagsLeft,openedCount,elapsedSeconds,levelOf,recordResult,validRecord,summarize,validSave,dayKey,pickDailyLevel,recordDaily,validDailyRecord,dailyBest} from './engine.js';
const $=id=>document.getElementById(id);
const COPY={standard:{eyebrow:'SCAN. FLAG. ISOLATE.',title:'异常点排查',subtitle:'逐个排查节点，标出异常，别踩中它。',view:'简洁模式',help:'玩法说明',newGame:'新的一局',flagsLabel:'剩余标记',timerLabel:'用时',levelTitle:'排查范围',levelTag:'LEVEL',levelHint:'范围越大节点越多。第一次点击一定安全，之后每一步都能靠已翻开的数字推出来，不需要猜。',recordsTitle:'最佳用时',hintTitle:'怎么读格子',hintTag:'RULE',hintText:'数字表示相邻八格里的异常点数量。右键或长按标出可疑节点，避免误点。全部安全节点排查完即通过。',footer:'异常点排查 · 离线单人 · 原创规则与界面',footerTag:'自动保存 · Alt+M',helpTitle:'玩法说明',newTitle:'开始新的一局？',newHint:'当前进度会被覆盖。',cancelNew:'继续当前进度',confirmNew:'确认新建',next:'再来一局',ready:'点任意一格开始，第一次点击一定不会踩中异常点。',playing:'数字是相邻八格里的异常点数量，标完再排查会稳一些。',won:'排查完成',lost:'命中异常点',wonText:'这一片区域已经清完了。',lostText:'触发了异常点，这一局结束。',dailyLabel:'今日范围',dailyBestLabel:'今日最佳',dailyStart:'开始今日一局',noRecord:'还没有完成记录。'},quiet:{eyebrow:'NODE INSPECTION / LOCAL JOB',title:'节点巡检',subtitle:'按巡检矩阵逐格确认，标出异常节点，别命中它。',view:'标准视图',help:'手册',newGame:'新建巡检',flagsLabel:'待查名额',timerLabel:'耗时',levelTitle:'巡检范围',levelTag:'SCOPE',levelHint:'范围越大节点越多。首格一定安全，之后每一步都由已排查节点的数值推出，不需要猜。',recordsTitle:'最短耗时',hintTitle:'读数约定',hintTag:'SPEC',hintText:'数字表示相邻八格的异常节点数量。右键或长按标记待查节点，避免误触。全部正常节点排查完毕即通过。',footer:'本地巡检工具 · 单人 · 不联网',footerTag:'自动快照 · Alt+M',helpTitle:'手册',newTitle:'新建巡检任务？',newHint:'当前任务的快照将被覆盖。',cancelNew:'保留当前任务',confirmNew:'确认新建',next:'再巡检一次',ready:'点击任一格启动巡检，首格不会命中异常。',playing:'数字是相邻八格的异常节点数，先标记再排查会更稳。',won:'巡检完成',lost:'命中异常节点',wonText:'这一片区域已确认无异常。',lostText:'触发了异常节点，本次巡检中止。',dailyLabel:'当日班次',dailyBestLabel:'当日最短',dailyStart:'开始当日班次',noRecord:'暂无巡检记录。'}};
let state=null,records=[],dailyRecords=[],noticeText='',pressTimer=0,longPressed=false,longPressAt=0,pressIndex=null,pendingStart=null;
try{const saved=JSON.parse(localStorage.getItem('nodesweep-save'));if(validSave(saved))state=saved;}catch{}
state??=createGame(LEVELS[0]);
try{const saved=JSON.parse(localStorage.getItem('nodesweep-records'));if(Array.isArray(saved))records=saved.filter(validRecord).slice(0,50);}catch{}
try{const saved=JSON.parse(localStorage.getItem('nodesweep-daily'));if(Array.isArray(saved))dailyRecords=saved.filter(validDailyRecord).slice(0,30);}catch{}
const quietView=setupQuiet({key:'nodesweep-view',standardTitle:'异常点排查 · HGame',quietTitle:'巡检日志 · 本地',onApply:()=>render()});
const text=key=>COPY[quietView.quiet?'quiet':'standard'][key];
const clock=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
function save(){try{localStorage.setItem('nodesweep-save',JSON.stringify(state));}catch{}}
function saveRecords(){try{localStorage.setItem('nodesweep-records',JSON.stringify(records));}catch{}}
function saveDaily(){try{localStorage.setItem('nodesweep-daily',JSON.stringify(dailyRecords));}catch{}}
function cellHTML(index,clue,quiet){
 const isOpen=state.open[index],isMine=state.mine[index],isFlag=state.flag[index];
 let cls='cell',body='';
 if(isOpen){
  cls+=' open';
  if(isMine){cls+=' mine';body=quiet?'!':'✳';}
  else if(clue>0){cls+=` n${clue}`;body=String(clue);}
 }else if(isFlag){
  cls+=' flag';
  body=quiet?'!':'⚑';
  if(state.status==='lost'&&!isMine)cls+=' wrong';
 }else cls+=' closed';
 return `<div class="${cls}" data-i="${index}">${body}</div>`;
}
function render(){
 const quiet=quietView.quiet;
 document.documentElement.dataset.view=quiet?'quiet':'standard';
 for(const key of ['eyebrow','title','subtitle','view','help','newGame','flagsLabel','timerLabel','levelTitle','levelTag','levelHint','recordsTitle','hintTitle','hintTag','hintText','footer','footerTag','helpTitle','newTitle','newHint','cancelNew','confirmNew','dailyLabel','dailyBestLabel','dailyStart'])$(key).textContent=text(key);
 $('brand').innerHTML=quiet?'LOCAL SESSION':'H▧GAME <span>/ 007</span>';
 const level=levelOf(state.size),clues=cluesOf(state.mine,state.size);
 $('flags').textContent=String(flagsLeft(state));
 $('timer').textContent=clock(elapsedSeconds(state));
 $('board').dataset.size=state.size;
 $('board').style.gridTemplateColumns=`repeat(${state.size},var(--cell))`;
 $('board').innerHTML=state.open.map((open,index)=>cellHTML(index,clues[index],quiet)).join('');
 $('notice').textContent=noticeText||(state.status==='ready'?text('ready'):state.status==='playing'?text('playing'):'');
 $('levels').innerHTML=LEVELS.map(item=>`<button data-level="${item.id}" class="${item.id===state.level?'active':''}">${quiet?item.quiet:item.name}<small>${item.size} × ${item.size} · ${item.mines}</small></button>`).join('');
 const today=dayKey(),todayLevel=pickDailyLevel(today),todayBest=dailyBest(dailyRecords,today);
 $('dailyLevel').textContent=quiet?todayLevel.quiet:todayLevel.name;
 $('dailyBest').textContent=todayBest?clock(todayBest.seconds):'—';
 $('levelHint').textContent=text('levelHint');
 const stats=summarize(records);
 $('records').innerHTML=LEVELS.map(item=>{const best=stats.bestTime[item.id];return `<div class="record"><span>${quiet?item.quiet:item.name}</span><b>${best===null?'—':clock(best)}</b><small>${stats.best[item.id].length} ${quiet?'次':'局'}</small></div>`;}).join('')||`<p class="empty">${text('noRecord')}</p>`;
 $('recordsTag').textContent=quiet?'BEST':'BEST';
 $('legend').innerHTML=quiet
  ?`<div class="legend-row"><span class="cell open n1">2</span><p><b>相邻异常数</b><span>该格周围八格的异常节点数量</span></p></div><div class="legend-row"><span class="cell closed"></span><p><b>未排查</b><span>点击确认，可能是异常节点</span></p></div><div class="legend-row"><span class="cell flag">!</span><p><b>待查</b><span>右键或长按标记，防止误触</span></p></div>`
  :`<div class="legend-row"><span class="cell open n1">2</span><p><b>数字</b><span>周围八格里的异常点数量</span></p></div><div class="legend-row"><span class="cell closed"></span><p><b>未排查</b><span>点击翻开，可能是异常点</span></p></div><div class="legend-row"><span class="cell flag">⚑</span><p><b>标记</b><span>右键或长按，防止误点</span></p></div>`;
 const over=state.status==='won'||state.status==='lost';
 $('result').hidden=!over;
 if(over){
  $('resultTitle').textContent=state.status==='won'?text('won'):text('lost');
  $('resultText').textContent=state.status==='won'?`${text('wonText')} ${quiet?'耗时':'用时'} ${clock(elapsedSeconds(state))}。`:text('lostText');
  $('next').textContent=text('next');
 }
 $('newGame').textContent=text('newGame');
}
function revealAt(index){
 try{reveal(state,index);}
 catch{return;}
 if(state.status==='won'){
  records=recordResult(records,state);saveRecords();
  if(typeof state.daily==='string'){dailyRecords=recordDaily(dailyRecords,state);saveDaily();}
 }
 save();render();
}
function flagAt(index){
 try{toggleFlag(state,index);}
 catch{return;}
 save();render();
}
const currentDaily=()=>state.daily===dayKey()?state.daily:null;
function startGame(level,dailyDate=null){
 state=createGame(level,{daily:dailyDate});
 noticeText='';
 save();render();
}
function requestLevel(id){
 const level=LEVELS.find(item=>item.id===id);
 if(!level||level.id===state.level&&state.status==='ready'&&!currentDaily())return;
 if(state.status==='playing'&&openedCount(state)>0){
  pendingStart={level,daily:null};
  $('newDialog').showModal();
  return;
 }
 startGame(level);
}
function requestDaily(){
 const today=dayKey(),level=pickDailyLevel(today);
 if(state.daily===today&&state.status==='ready')return;
 if(state.status==='playing'&&openedCount(state)>0){
  pendingStart={level,daily:today};
  $('newDialog').showModal();
  return;
 }
 startGame(level,today);
}
$('view').onclick=()=>quietView.toggle();
$('board').addEventListener('contextmenu',event=>{
 event.preventDefault();
 if(Date.now()-longPressAt<700)return;
 const cell=event.target.closest('[data-i]');
 if(cell)flagAt(Number(cell.dataset.i));
});
$('board').addEventListener('pointerdown',event=>{
 if(event.button===2)return;
 const cell=event.target.closest('[data-i]');
 if(!cell)return;
 event.preventDefault();
 pressIndex=Number(cell.dataset.i);
 longPressed=false;
 clearTimeout(pressTimer);
 if(event.pointerType==='mouse')return;
 pressTimer=setTimeout(()=>{
  longPressed=true;
  longPressAt=Date.now();
  if(pressIndex!==null)flagAt(pressIndex);
 },450);
});
$('board').addEventListener('pointerup',event=>{
 clearTimeout(pressTimer);
 const index=pressIndex;
 pressIndex=null;
 if(longPressed||index===null)return;
 const cell=event.target.closest('[data-i]');
 if(cell&&Number(cell.dataset.i)===index)revealAt(index);
});
$('board').addEventListener('pointercancel',()=>{clearTimeout(pressTimer);longPressed=false;pressIndex=null;});
$('levels').onclick=event=>{const button=event.target.closest('[data-level]');if(button)requestLevel(button.dataset.level);};
$('dailyStart').onclick=requestDaily;
$('newGame').onclick=()=>{
 if(state.status==='playing'&&openedCount(state)>0){pendingStart={level:levelOf(state.size),daily:currentDaily()};$('newDialog').showModal();return;}
 startGame(levelOf(state.size),currentDaily());
};
$('cancelNew').onclick=()=>{$('newDialog').close();pendingStart=null;};
$('confirmNew').onclick=()=>{
 const target=pendingStart;$('newDialog').close();pendingStart=null;
 if(target)startGame(target.level,target.daily);else startGame(levelOf(state.size),currentDaily());
};
$('next').onclick=()=>startGame(levelOf(state.size),currentDaily());
$('help').onclick=()=>{
 $('helpTitle').textContent=text('helpTitle');
 $('helpContent').innerHTML=quietView.quiet
  ?'<p>巡检矩阵里有一部分节点被标记为异常，需要靠已排查节点上的数字把它们全部定位出来。</p><ol><li>左键点击未排查节点：确认该节点，若是异常节点则本次巡检中止。</li><li>右键或长按：标记为待查，再点一次取消。</li><li>数字表示周围八格中的异常节点数量，全部正常节点排查完即通过。</li><li>首格一定安全，其余每一步都能从数字推出来，不需要猜。</li></ol><p>进度自动保存，刷新可继续。切换范围会新建一次巡检。当日班次按日期轮换，当日最短单独统计。</p>'
  :'<p>棋盘里埋着若干异常点，要靠已翻开格子上的数字把它们全部定位出来。</p><ol><li>左键点击未翻开的格子：翻开它，如果正好是异常点则本局结束。</li><li>右键或长按：插旗标记可疑位置，再点一次取消。</li><li>数字表示周围八格里的异常点数量，所有安全格翻完即通过。</li><li>第一次点击一定安全，之后每一步都能从数字推出来，不需要猜。</li></ol><p>进度自动保存，刷新可以继续。切换范围会开新的一局。今日范围按日期轮换，当日最佳单独记录。</p>';
 $('helpDialog').showModal();
};
$('closeHelp').onclick=()=>$('helpDialog').close();
setInterval(()=>{if(state.status==='playing')$('timer').textContent=clock(elapsedSeconds(state));},500);
render();
