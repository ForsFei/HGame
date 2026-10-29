import {PUZZLES} from './puzzles.js';
import {FILLED,MARKED,MISTAKE_LIMIT,createGame,claim,settledCount,filledCount,mistakesLeft,rowDone,colDone,puzzleClues,validSave,dayKey,pickDaily,pickPractice,recordResult,validRecord,summarize} from './engine.js';
const $=id=>document.getElementById(id);
const COPY={
 standard:{eyebrow:'PUSH. PARK. CLEAR.',title:'像素织图',subtitle:'看行列线索，逐格判定 1 或 0；点错会揭示答案，三次机会用完本局结束。',view:'简洁模式',help:'玩法说明',newGame:'新的一局',recordsButton:'本地记录',dailyButton:'每日挑战',dailyTitle:'每日挑战',dailyPlay:'开始今日',dailyRecords:'今日记录',boardTitle:'织格',legendTitle:'怎么判定',legendTag:'RULE',legendHint:'先选 1 或 0，再点格子立即结算：判对锁定，判错变红并显示正确状态。某行或列的 1 或 0 全部找齐后，剩余格子会自动补满。',sizeTitle:'棋盘规模',sizeHint:'规模越大，线索越少。每日挑战固定为 10 × 10。',statsTitle:'本地统计',statDoneLabel:'完成',statDailyLabel:'每日',footer:'像素织图 · 离线单人 · 原创规则与界面',footerTag:'自动保存 · Alt+M',helpTitle:'玩法说明',recordsTitle:'本地记录',newTitle:'开始新的一局？',newHint:'将覆盖当前自动存档。',cancelNew:'继续当前进度',confirmNew:'确认新建',next:'下一关',again:'再试一次',pickLabel:'点击格子判定为',mistakesLabel:'失误',settledLabel:'已判定',fillLabel:'已找出',legendOne:'判定 1',legendOneHint:'属于图案的格子',legendZero:'判定 0',legendZeroHint:'确定为空，补全也会标出',legendWrong:'点错',legendWrongHint:'红色显示这一格的正确状态',lostTitle:'本局结束',lostText:'三次机会已经用完。可以重试同一题，或换一题继续。'},
 quiet:{eyebrow:'INDEX. SETTLE. MATCH.',title:'位图索引',subtitle:'按行列索引逐格判定 0/1；误判会显示正确位，三次误判终止本批次。',view:'标准视图',help:'手册',newGame:'新建批次',recordsButton:'运行记录',dailyButton:'每日批次',dailyTitle:'每日批次',dailyPlay:'执行今日',dailyRecords:'今日记录',boardTitle:'矩阵',legendTitle:'判定约定',legendTag:'SPEC',legendHint:'先选 1 或 0，再点格子立即结算：判对锁定，误判变红并显示正确位。某行或列的 0/1 全部找齐后，其余位自动补满。',sizeTitle:'矩阵规模',sizeHint:'规模越大，约束越少。每日批次固定为 10 × 10。',statsTitle:'运行统计',statDoneLabel:'已生成',statDailyLabel:'每日',footer:'本地索引工具 · 单人 · 不联网',footerTag:'自动快照 · Alt+M',helpTitle:'手册',recordsTitle:'运行记录',newTitle:'新建批次？',newHint:'当前矩阵的快照将被覆盖。',cancelNew:'保留当前批次',confirmNew:'确认新建',next:'下一批次',again:'重新执行',pickLabel:'本次判定为',mistakesLabel:'误判',settledLabel:'已判定',fillLabel:'已置位',legendOne:'置位 1',legendOneHint:'属于矩阵的位',legendZero:'清零 0',legendZeroHint:'该位为空，补全也会标出',legendWrong:'误判',legendWrongHint:'红色显示该位的正确状态',lostTitle:'批次终止',lostText:'三次误判已经用完。可以重新执行同一批次，或新建批次。'}
};
let state=null,quiet=document.documentElement.dataset.view==='quiet',records=[],noticeText='',pickValue=FILLED,pendingSize=10,pendingKind='practice';
try{const saved=JSON.parse(localStorage.getItem('pixelweave-save'));if(validSave(saved))state=saved;}catch{}
state??=createGame(pickPractice(PUZZLES,10),{mode:'practice'});
try{const saved=JSON.parse(localStorage.getItem('pixelweave-records'));if(Array.isArray(saved))records=saved.filter(validRecord).slice(0,50);}catch{}
const text=key=>COPY[quiet?'quiet':'standard'][key];
const puzzleOf=value=>PUZZLES.find(item=>item.id===value.puzzleId)||{id:value.puzzleId,size:value.size,solution:value.solution,name:'—'};
const fmtDate=key=>key?`${key.slice(0,4)}-${key.slice(4,6)}-${key.slice(6,8)}`:'';
const today=()=>dayKey();
const totalTarget=value=>value.solution.join('').split('').filter(ch=>ch==='1').length;
function save(){try{localStorage.setItem('pixelweave-save',JSON.stringify(state));}catch{}}
function saveRecords(){try{localStorage.setItem('pixelweave-records',JSON.stringify(records));}catch{}}
function notify(value){noticeText=value;}
function cellClass(mark,index){
 let cls='cell '+(mark===FILLED?'one':mark===MARKED?'zero':'unknown');
 if(state.wrong.includes(index))cls+=' wrong';
 if(state.auto.includes(index))cls+=' auto';
 return cls;
}
function renderClues(){
 const puzzle=puzzleOf(state),{rows,cols}=puzzleClues(puzzle);
 const line=(list,cls)=>list.length?list.map(value=>`<b>${value}</b>`).join(''):`<b class="zero">0</b>`;
 $('colClues').innerHTML=cols.map((clue,c)=>`<div class="col-clue${colDone(state,c)?' done':''}">${line(clue)}</div>`).join('');
 $('rowClues').innerHTML=rows.map((clue,r)=>`<div class="row-clue${rowDone(state,r)?' done':''}">${line(clue)}</div>`).join('');
}
function updatePick(){
 const current=pickValue===MARKED?'0':'1';
 for(const button of $('pick').querySelectorAll('[data-value]'))button.classList.toggle('active',button.dataset.value===current);
}
function render(){
 document.documentElement.dataset.view=quiet?'quiet':'standard';
 document.title=quiet?'位图索引 · 本地':'像素织图 · HGame';
 for(const key of ['eyebrow','title','subtitle','view','help','newGame','recordsButton','dailyButton','dailyTitle','dailyRecords','boardTitle','legendTitle','legendTag','legendHint','sizeTitle','sizeHint','statsTitle','statDoneLabel','statDailyLabel','footer','footerTag','helpTitle','recordsTitle','pickLabel'])$(key).textContent=text(key);
 $('brand').innerHTML=quiet?'LOCAL SESSION':'H▧GAME <span>/ 005</span>';
 const puzzle=puzzleOf(state),day=today(),current=state.mode==='daily'&&state.date===day;
 $('modeTag').textContent=state.mode==='daily'?(quiet?`每日批次 · ${fmtDate(state.date)}`:`每日挑战 · ${fmtDate(state.date)}`):(quiet?'批次 · 随机':'自由练习');
 $('sizeTag').textContent=`${state.size} × ${state.size}`+(puzzle.name&&puzzle.name!=='—'?(quiet?` · 批次 ${puzzle.name}`:` · ${puzzle.name}`):'');
 const filled=filledCount(state),target=totalTarget(state),total=state.size*state.size;
 $('progressTag').textContent=`${text('settledLabel')} ${settledCount(state)} / ${total}`;
 $('livesTag').textContent=`${text('mistakesLabel')} ${state.mistakes} / ${MISTAKE_LIMIT}`;
 $('livesTag').classList.toggle('warn',state.status==='playing'&&mistakesLeft(state)<=1);
 $('boardHint').textContent=`${state.size} × ${state.size}`;
 $('board').dataset.size=state.size;
 renderClues();
 const grid=$('grid');
 grid.style.gridTemplateColumns=`repeat(${state.size},var(--cell))`;
 grid.innerHTML=state.marks.map((mark,index)=>`<span class="${cellClass(mark,index)}" data-i="${index}"></span>`).join('');
 $('boardStatus').textContent=noticeText;
 $('fillTag').textContent=`${text('fillLabel')} ${filled} / ${target}`;
 $('next').textContent=state.status==='lost'?text('again'):text('next');
 $('result').hidden=state.status==='playing';
 if(state.status==='won'){
  $('resultTitle').textContent=quiet?'生成完成':'织好了';
  $('resultTag').textContent=`${state.size} × ${state.size}`;
  $('resultText').textContent=quiet?`批次 ${puzzle.name} 的矩阵已还原，索引全部匹配。`:`图案「${puzzle.name}」完成，线索全部对上。`;
 }else if(state.status==='lost'){
  $('resultTitle').textContent=text('lostTitle');
  $('resultTag').textContent=`${state.size} × ${state.size}`;
  $('resultText').textContent=`${text('lostText')} ${text('mistakesLabel')} ${state.mistakes} / ${MISTAKE_LIMIT}。`;
 }
 $('legend').innerHTML=`
  <div class="legend-row"><span class="cell one"></span><p><b>${text('legendOne')}</b><span>${text('legendOneHint')}</span></p></div>
  <div class="legend-row"><span class="cell zero"></span><p><b>${text('legendZero')}</b><span>${text('legendZeroHint')}</span></p></div>
  <div class="legend-row"><span class="cell zero wrong"></span><p><b>${text('legendWrong')}</b><span>${text('legendWrongHint')}</span></p></div>`;
 $('sizes').innerHTML=[5,10,15].map(size=>`<button data-size="${size}" class="${size===state.size?'active':''}">${size} × ${size}</button>`).join('');
 $('sizeTagSide').textContent=quiet?'DIM':'SIZE';
 const stats=summarize(records);
 $('statDone').textContent=stats.done;
 $('statDaily').textContent=stats.daily;
 $('statsTag').textContent=quiet?'最近 50 次':'最近 50 局';
 $('records').innerHTML=records.length?records.slice(0,4).map(item=>`<div class="record"><span>${item.mode==='daily'?'每日':'练习'}</span><span>${item.size}×${item.size}</span><b>${(PUZZLES.find(x=>x.id===item.puzzleId)||{}).name||'—'}</b></div>`).join(''):`<p class="empty">${quiet?'暂无运行记录。':'还没有完成记录。'}</p>`;
 const done=records.find(item=>item.mode==='daily'&&item.date===day);
 $('dailyHint').textContent=done?(quiet?`今日批次已生成 · ${done.size} × ${done.size}`:`今日已完成 · ${done.size} × ${done.size}`):(quiet?'按本地日期生成的固定矩阵，每天一个。':'每天一题，北京时间零点换新。');
 $('dailyPlay').textContent=current&&state.status==='playing'?text('continueDaily'):text('dailyPlay');
 $('daily').classList.toggle('active',Boolean(current&&state.status==='playing'));
 updatePick();
}
function startGame(puzzle,mode='practice',date=null){
 state=createGame(puzzle,{mode,date});
 noticeText='';
 save();render();
}
function requestPractice(size){
 pendingSize=size;pendingKind='practice';
 if(!canDiscard()){startGame(pickPractice(PUZZLES,size));return;}
 $('newTitle').textContent=text('newTitle');
 $('newHint').textContent=text('newHint');
 $('newDialog').showModal();
}
function canDiscard(){return state.status==='playing'&&settledCount(state)>0;}
function requestDaily(){
 if(state.mode==='daily'&&state.date===today()&&state.status==='playing'){notify(quiet?'今日批次正在进行。':'今天这一题还没做完，继续就好。');render();return;}
 if(canDiscard()){pendingKind='daily';$('newTitle').textContent=text('newTitle');$('newHint').textContent=text('newHint');$('newDialog').showModal();return;}
 startGame(pickDaily(PUZZLES),'daily',today());
}
function claimAt(index,value){
 if(state.status!=='playing')return;
 let result;
 try{result=claim(state,index,value);}catch{return;}
 if(!result.ok)return;
 if(result.wrong){
  const correct=result.correct===FILLED?'1':'0';
  const left=mistakesLeft(state);
  if(state.status==='lost')noticeText=quiet?`误判：该位应为 ${correct}，三次误判已用完。`:`点错了：这一格应为 ${correct}，三次机会已用完。`;
  else noticeText=quiet?`误判：该位应为 ${correct}，剩余 ${left} 次。`:`点错了：这一格应为 ${correct}，还剩 ${left} 次机会。`;
 }else if(result.auto.length){
  noticeText=quiet?`已自动补齐 ${result.auto.length} 个位。`:`已自动补全 ${result.auto.length} 格。`;
 }else noticeText='';
 if(state.status==='won'){
  noticeText=quiet?'全部位已对齐，矩阵生成完成。':'图案完成，线索全部对上。';
  records=recordResult(records,state);saveRecords();
 }
 save();render();
}
$('view').onclick=()=>{quiet=!quiet;try{localStorage.setItem('pixelweave-view',quiet?'quiet':'standard');}catch{}render();};
$('help').onclick=()=>{
 $('helpTitle').textContent=text('helpTitle');
 $('helpContent').innerHTML=quiet
  ?'<p>每一批次是一个隐藏的 0/1 矩阵，行列开头的数字是它在该方向连续 1 的长度。</p><ol><li>先选择本次判定为 1 还是 0，再点格子；每格立即结算并锁定。</li><li>判对即保留；误判会变红并显示该位的正确状态，同时消耗一次机会。</li><li>每批最多三次误判，用完立即终止，可以直接重新执行同一批次。</li><li>某行或列的 1 全部找齐后，其余位自动补 0；0 全部找齐后，其余位自动补 1。</li><li>所有位与索引一致时，矩阵生成完成。</li></ol><p>进度与运行记录都保存在本浏览器，不需要联网。</p>'
  :'<p>每一局是一个隐藏的像素图，行列开头的数字是它在该方向连续涂黑 1 的长度。</p><ol><li>先选择判定为 1 还是 0，再点格子；每格立即结算并锁定。</li><li>判对即保留；判错会变红并显示这一格的正确状态，同时消耗一次机会。</li><li>每局最多三次机会，用完本局结束，可以直接重试同一题。</li><li>某行或列的 1 全部找齐后，其余格子自动补为 0；0 全部找齐后，其余格子自动补为 1。</li><li>所有格子判定完成即通关。</li></ol><p>进度和记录都保存在本浏览器，不需要联网。</p>';
 $('helpDialog').showModal();
};
$('closeHelp').onclick=()=>$('helpDialog').close();
$('recordsButton').onclick=()=>{
 const stats=summarize(records);
 $('recordsSummary').textContent=quiet?`共 ${stats.done} 次生成，每日批次 ${stats.daily} 次。`:`共完成 ${stats.done} 局，其中每日 ${stats.daily} 局。`;
 $('recordsList').innerHTML=records.length?records.map(item=>`<div class="record wide"><span>${item.mode==='daily'?'每日':'练习'}</span><span>${item.mode==='daily'?fmtDate(item.date):'—'}</span><span>${item.size} × ${item.size}</span><b>${(PUZZLES.find(x=>x.id===item.puzzleId)||{}).name||'—'}</b></div>`).join(''):`<p class="empty">${quiet?'暂无运行记录。':'还没有完成记录。'}</p>`;
 $('recordsDialog').showModal();
};
$('closeRecords').onclick=()=>$('recordsDialog').close();
$('dailyPlay').onclick=requestDaily;
$('dailyRecords').onclick=()=>$('recordsButton').click();
$('newGame').onclick=()=>requestPractice(state.size);
$('next').onclick=()=>{
 if(state.status==='lost'){
  startGame(PUZZLES.find(item=>item.id===state.puzzleId)||{id:state.puzzleId,size:state.size,solution:state.solution},state.mode,state.date);
  return;
 }
 startGame(pickPractice(PUZZLES,state.size,Math.random,state.puzzleId));
};
$('cancelNew').onclick=()=>$('newDialog').close();
$('confirmNew').onclick=()=>{$('newDialog').close();if(pendingKind==='daily')startGame(pickDaily(PUZZLES),'daily',today());else startGame(pickPractice(PUZZLES,pendingSize));};
$('sizes').onclick=event=>{const button=event.target.closest('[data-size]');if(button)requestPractice(Number(button.dataset.size));};
$('pick').onclick=event=>{
 const button=event.target.closest('[data-value]');
 if(!button)return;
 pickValue=button.dataset.value==='0'?MARKED:FILLED;
 updatePick();
};
$('grid').addEventListener('click',event=>{
 const cell=event.target.closest('[data-i]');
 if(!cell)return;
 claimAt(Number(cell.dataset.i),pickValue);
});
$('grid').addEventListener('contextmenu',event=>{
 event.preventDefault();
 const cell=event.target.closest('[data-i]');
 if(cell)claimAt(Number(cell.dataset.i),MARKED);
});
document.addEventListener('keydown',event=>{
 if(event.altKey&&event.code==='KeyM'&&!event.repeat){event.preventDefault();quiet=!quiet;try{localStorage.setItem('pixelweave-view',quiet?'quiet':'standard');}catch{}render();return;}
 if(event.ctrlKey||event.metaKey||event.altKey)return;
 if($('helpDialog').open||$('recordsDialog').open||$('newDialog').open)return;
 if(event.target instanceof HTMLElement&&event.target.closest('input,select,textarea'))return;
 if(event.key==='1'||event.key==='0'){event.preventDefault();pickValue=event.key==='1'?FILLED:MARKED;updatePick();}
});
render();
