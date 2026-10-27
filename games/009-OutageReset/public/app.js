import {setupQuiet} from './quiet.js';
import {LEVELS,levelOf,createGame,press,restart,litCount,elapsedSeconds,validSave,recordResult,validRecord,summarize} from './engine.js';
const $=id=>document.getElementById(id);
const COPY={
 standard:{eyebrow:'ALERT. FLIP. CLEAR.',title:'告警复位',subtitle:'点一盏灯会连带翻转上下左右，把所有告警熄掉。',view:'简洁模式',help:'玩法说明',newGame:'新的一局',alertsLabel:'剩余告警',movesLabel:'步数',timerLabel:'用时',levelTitle:'棋盘规模',levelTag:'LEVEL',levelHint:'规模越大灯越多。每次点击会翻转自己与上下左右共五格（边角少一两格），全部熄灭即完成。',retry:'重来本局',recordsTitle:'最佳成绩',recordsTag:'BEST',recordsHint:'每档记录最快的一次，完成步数与参考步数一起保存。',hintTitle:'怎么熄灯',hintTag:'RULE',hintText:'亮着的格子是告警灯。点击一格，它和上下左右会一起翻转；点击次数不限，但步数越少越好。',footer:'告警复位 · 离线单人 · 原创规则与界面',footerTag:'自动保存 · Alt+M',helpTitle:'玩法说明',newTitle:'开始新的一局？',newHint:'当前进度会被覆盖。',cancelNew:'继续当前进度',confirmNew:'确认新建',next:'再来一局',ready:'点击任意灯格开始：它和上下左右四格会一起翻转。',playing:'还剩 {lit} 盏告警灯，参考最少 {optimal} 步。',won:'全部告警灯已熄灭。',timeLabel:'用时',steps:'步',optimalLabel:'参考最少'},
 quiet:{eyebrow:'ALERT CLEAR / LOCAL JOB',title:'告警清零',subtitle:'按十字翻转规则清掉全部告警指示，记录操作次数。',view:'标准视图',help:'手册',newGame:'新建记录',alertsLabel:'待清告警',movesLabel:'操作次数',timerLabel:'耗时',levelTitle:'设备规模',levelTag:'SCOPE',levelHint:'规模越大告警越多。每次操作翻转当前格与上下左右共五格（边角少一两格），清空即完成。',retry:'重置本次',recordsTitle:'最短耗时',recordsTag:'BEST',recordsHint:'每档只记一条最短记录，操作次数与理论下限一并留档。',hintTitle:'读数约定',hintTag:'SPEC',hintText:'高亮格为待清告警。点击一格会连带翻转上下左右；操作次数不限，越接近理论下限越好。',footer:'本地值班工具 · 单人 · 不联网',footerTag:'自动快照 · Alt+M',helpTitle:'手册',newTitle:'新建清零任务？',newHint:'当前任务的快照将被覆盖。',cancelNew:'保留当前任务',confirmNew:'确认新建',next:'再清一次',ready:'点击任一格开始：该格与上下左右同时翻转。',playing:'待清 {lit} 盏，理论下限 {optimal} 步。',won:'全部告警已清零。',timeLabel:'耗时',steps:'次',optimalLabel:'理论下限'}};
let state=null,records=[],pendingLevel=null,focusIndex=null;
try{const saved=JSON.parse(localStorage.getItem('outagereset-save'));if(validSave(saved))state=saved;}catch{}
state??=createGame(LEVELS[0]);
try{const saved=JSON.parse(localStorage.getItem('outagereset-records'));if(Array.isArray(saved))records=saved.filter(validRecord).slice(0,50);}catch{}
const quietView=setupQuiet({key:'outagereset-view',standardTitle:'告警复位 · HGame',quietTitle:'告警清零 · 本地',onApply:()=>render()});
const text=key=>COPY[quietView.quiet?'quiet':'standard'][key];
const clock=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const fill=(template,values)=>template.replace(/\{(\w+)\}/g,(all,key)=>key in values?String(values[key]):all);
function save(){try{localStorage.setItem('outagereset-save',JSON.stringify(state));}catch{}}
function saveRecords(){try{localStorage.setItem('outagereset-records',JSON.stringify(records));}catch{}}
function render(){
 const quiet=quietView.quiet,moves=state.moves,lit=litCount(state.lights);
 document.documentElement.dataset.view=quiet?'quiet':'standard';
 for(const key of ['eyebrow','title','subtitle','view','help','newGame','alertsLabel','movesLabel','timerLabel','levelTitle','levelTag','levelHint','retry','recordsTitle','recordsTag','recordsHint','hintTitle','hintTag','hintText','footer','footerTag','helpTitle','newTitle','newHint','cancelNew','confirmNew'])$(key).textContent=text(key);
 $('brand').innerHTML=quiet?'LOCAL SESSION':'H▧GAME <span>/ 009</span>';
 $('alerts').textContent=String(lit);
 $('moves').textContent=String(moves);
 $('timer').textContent=clock(elapsedSeconds(state));
 $('board').dataset.size=state.size;
 $('board').style.gridTemplateColumns=`repeat(${state.size},var(--cell))`;
 $('board').innerHTML=state.lights.map((value,index)=>`<div class="lamp${value?' on':''}" data-i="${index}" role="button" tabindex="0" aria-label="灯 ${index+1} ${value?'亮':'灭'}"></div>`).join('');
 const won=state.status==='won';
 $('notice').textContent=won?text('won'):fill(text(state.status==='ready'?'ready':'playing'),{lit,optimal:state.optimal});
 $('levels').innerHTML=LEVELS.map(item=>`<button data-level="${item.id}" class="${item.id===state.level?'active':''}">${quiet?item.quiet:item.name}<small>${item.size} × ${item.size}</small></button>`).join('');
 const stats=summarize(records);
 $('records').innerHTML=LEVELS.map(item=>{const best=stats.bestTime[item.id],moves=stats.bestMoves[item.id];return `<div class="record"><span>${quiet?item.quiet:item.name}</span><b>${best===null?'—':clock(best)}</b><small>${moves===null?'—':`${moves} ${text('steps')}`}</small></div>`;}).join('');
 $('legend').innerHTML=quiet
  ?`<div class="legend-row"><div class="lamp on"></div><p><b>待清告警</b><span>高亮表示这一路还在告警</span></p></div><div class="legend-row"><div class="lamp"></div><p><b>已清零</b><span>熄灭后不再计入待清数量</span></p></div><div class="legend-row"><div class="lamp"></div><p><b>十字翻转</b><span>点击会连带上下左右四格</span></p></div>`
  :`<div class="legend-row"><div class="lamp on"></div><p><b>告警灯</b><span>亮着表示这一路还在告警</span></p></div><div class="legend-row"><div class="lamp"></div><p><b>已熄灭</b><span>熄灭后不再计入剩余告警</span></p></div><div class="legend-row"><div class="lamp"></div><p><b>十字翻转</b><span>点击会连带上下左右四格一起翻转</span></p></div>`;
 $('result').hidden=!won;
 if(won){
  $('resultTitle').textContent=quiet?'清零完成':'全部熄灭';
  $('resultText').textContent=`${text('won')} ${text('timeLabel')} ${clock(elapsedSeconds(state))} · ${moves} ${text('steps')}（${text('optimalLabel')} ${state.optimal} ${text('steps')}）。`;
 }
 $('next').textContent=text('next');
 $('newGame').textContent=text('newGame');
 if(focusIndex!==null){
  const lamp=$('board').querySelector(`[data-i="${focusIndex}"]`);
  if(lamp)lamp.focus({preventScroll:true});
 }
}
function pulse(index){
 const lamp=$('board').querySelector(`[data-i="${index}"]`);
 if(!lamp)return;
 lamp.classList.add('pop');
 setTimeout(()=>lamp.classList.remove('pop'),160);
}
function pressAt(index){
 try{press(state,index);}catch{return;}
 if(state.status==='won'){records=recordResult(records,state);saveRecords();}
 save();render();pulse(index);
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
$('board').addEventListener('contextmenu',event=>event.preventDefault());
$('board').addEventListener('click',event=>{
 const lamp=event.target.closest('[data-i]');
 if(lamp)pressAt(Number(lamp.dataset.i));
});
$('board').addEventListener('keydown',event=>{
 if(event.key!=='Enter'&&event.key!==' ')return;
 const lamp=event.target.closest('[data-i]');
 if(!lamp)return;
 event.preventDefault();
 focusIndex=Number(lamp.dataset.i);
 pressAt(focusIndex);
});
$('levels').onclick=event=>{const button=event.target.closest('[data-level]');if(button)requestLevel(button.dataset.level);};
$('retry').onclick=()=>{
 restart(state);
 focusIndex=null;
 save();render();
};
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
  ?'<p>告警灯盘上亮着的格子表示仍在告警，需要全部清掉。</p><ol><li>点击一格：该格与上下左右四格同时翻转（边角只翻两到三格）。</li><li>重复点击会来回翻转，操作次数不限。</li><li>顶部的「理论下限」是本盘的最少步数，可用来判断自己绕了多少路。</li><li>「重置本次」把灯盘恢复到开局状态，不换新题。</li><li>清空全部告警即完成，用时与操作次数都会记录。</li></ol><p>进度自动保存，刷新可继续。切换规模会新建一次清零任务。</p>'
  :'<p>棋盘上的每一格是一盏告警灯，点亮表示这一路还在告警，需要全部熄掉。</p><ol><li>点击一格：它和上下左右四格一起翻转（边角只翻两到三格）。</li><li>再点一次会翻回去，点击次数不限。</li><li>提示行里的「参考最少」是这盘棋的最少步数，可以看看自己绕了多少路。</li><li>「重来本局」把灯盘恢复到开局状态，不换新题。</li><li>全部熄灭即通过，用时与步数都会记进战绩。</li></ol><p>进度自动保存，刷新可以继续。切换规模会开新的一局。</p>';
 $('helpDialog').showModal();
};
$('closeHelp').onclick=()=>$('helpDialog').close();
setInterval(()=>{if(state.status==='playing')$('timer').textContent=clock(elapsedSeconds(state));},500);
render();
