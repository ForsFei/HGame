import {PUZZLES} from './puzzles.js';
import {EMPTY,FILLED,MARKED,createGame,setMark,isSolved,mistakes,filledCount,rowDone,colDone,puzzleClues,validSave,dayKey,pickDaily,pickPractice,recordResult,validRecord,summarize} from './engine.js';
const $=id=>document.getElementById(id);
const COPY={standard:{eyebrow:'READ THE ROWS. WEAVE THE GRID.',title:'像素织图',subtitle:'每一行数字，都是一段连续涂黑的长度。',view:'简洁模式',help:'玩法说明',newGame:'新的一局',recordsButton:'本地记录',dailyButton:'每日挑战',dailyTitle:'每日挑战',dailyPlay:'开始今日',dailyRecords:'今日记录',boardTitle:'织格',legendTitle:'怎么读线索',legendTag:'RULE',legendHint:'行列开头的数字表示连续涂黑的长度与顺序，例如 3 1 表示先三连黑、至少空一格、再一格黑。全部格子的涂黑状态与线索一致时即为完成。',sizeTitle:'棋盘规模',sizeHint:'规模越大，需要的推理越多。每日挑战固定为 10 × 10。',statsTitle:'本地统计',statDoneLabel:'完成',statDailyLabel:'每日',footer:'像素织图 · 离线单人 · 原创规则与界面',footerTag:'自动保存 · Alt+M',helpTitle:'玩法说明',recordsTitle:'本地记录',newTitle:'开始新的一局？',newHint:'将覆盖当前自动存档。',cancelNew:'继续当前进度',confirmNew:'确认新建',check:'检查',undo:'撤销',clear:'清除',next:'下一关',again:'再来一局',continueDaily:'继续今日',fillLabel:'已涂黑'},quiet:{eyebrow:'BITMAP INDEX / LOCAL JOB',title:'位图索引',subtitle:'按行列索引还原 0/1 矩阵：点击置位，右键或长按清零。',view:'标准视图',help:'手册',newGame:'新建批次',recordsButton:'运行记录',dailyButton:'每日批次',dailyTitle:'每日批次',dailyPlay:'执行今日',dailyRecords:'今日记录',boardTitle:'矩阵',legendTitle:'索引约定',legendTag:'SPEC',legendHint:'行、列开头的数字表示连续 1 的长度与顺序，例如 3 1 表示连续三位 1、至少空一位、再一位 1。所有位与索引一致时，矩阵生成完成。',sizeTitle:'矩阵规模',sizeHint:'规模越大，约束越少。每日批次固定为 10 × 10。',statsTitle:'运行统计',statDoneLabel:'已生成',statDailyLabel:'每日',footer:'本地索引工具 · 单人 · 不联网',footerTag:'自动快照 · Alt+M',helpTitle:'手册',recordsTitle:'运行记录',newTitle:'新建批次？',newHint:'当前矩阵的快照将被覆盖。',cancelNew:'保留当前批次',confirmNew:'确认新建',check:'校验',undo:'回退',clear:'清空',next:'下一批次',again:'再来一次',continueDaily:'继续批次',fillLabel:'已置位'}};
let state=null,quiet=document.documentElement.dataset.view==='quiet',records=[],noticeText='',dragValue=null,batch=null,undoStack=[],longPress=0,wrongSet=new Set(),pendingSize=10,pendingKind='practice';
try{const saved=JSON.parse(localStorage.getItem('pixelweave-save'));if(validSave(saved))state=saved;}catch{}
state??=createGame(pickPractice(PUZZLES,10),{mode:'practice'});
try{const saved=JSON.parse(localStorage.getItem('pixelweave-records'));if(Array.isArray(saved))records=saved.filter(validRecord).slice(0,50);}catch{}
const text=key=>COPY[quiet?'quiet':'standard'][key];
const puzzleOf=value=>({size:value.size,solution:value.solution,name:(PUZZLES.find(item=>item.id===value.puzzleId)||{}).name||'—'});
const fmtDate=key=>key?`${key.slice(0,4)}-${key.slice(4,6)}-${key.slice(6,8)}`:'';
const today=()=>dayKey();
const totalTarget=value=>value.solution.join('').split('').filter(ch=>ch==='1').length;
function save(){try{localStorage.setItem('pixelweave-save',JSON.stringify(state));}catch{}}
function saveRecords(){try{localStorage.setItem('pixelweave-records',JSON.stringify(records));}catch{}}
function notify(value){noticeText=value;}
function pushUndo(items){if(!items.length)return;undoStack.push(items);if(undoStack.length>200)undoStack.shift();}
function apply(index,value){
 if(state.status!=='playing')return false;
 const before=state.marks[index];
 if(before===value)return false;
 if(batch)batch.push({index,before});else pushUndo([{index,before}]);
 setMark(state,index,value);
 return true;
}
function settle(){
 state.status=isSolved(state)?'won':'playing';
 if(state.status==='won'){records=recordResult(records,state);saveRecords();}
 save();
}
function cellText(mark){return quiet&&mark===FILLED?'1':quiet&&mark===MARKED?'0':'';}
function paintCell(index){
 const node=$('grid').children[index];
 if(!node)return;
 node.className=`cell ${state.marks[index]===FILLED?'filled':state.marks[index]===MARKED?'marked':'empty'}${wrongSet.has(index)?' wrong':''}`;
 node.textContent=cellText(state.marks[index]);
}
function renderClues(){
 const puzzle=puzzleOf(state),{rows,cols}=puzzleClues(puzzle);
 const line=(list,cls)=>list.length?list.map(value=>`<b>${value}</b>`).join(''):`<b class="zero">0</b>`;
 $('colClues').innerHTML=cols.map((clue,c)=>`<div class="col-clue${colDone(state,c)?' done':''}">${line(clue)}</div>`).join('');
 $('rowClues').innerHTML=rows.map((clue,r)=>`<div class="row-clue${rowDone(state,r)?' done':''}">${line(clue)}</div>`).join('');
}
function render(){
 document.documentElement.dataset.view=quiet?'quiet':'standard';
 document.title=quiet?'位图索引 · 本地':'像素织图 · HGame';
 for(const key of ['eyebrow','title','subtitle','view','help','newGame','recordsButton','dailyButton','dailyTitle','dailyRecords','boardTitle','legendTitle','legendTag','legendHint','sizeTitle','sizeHint','statsTitle','statDoneLabel','statDailyLabel','footer','footerTag','helpTitle','recordsTitle','check','undo','clear'])$(key).textContent=text(key);
 $('brand').innerHTML=quiet?'LOCAL SESSION':'H▧GAME <span>/ 005</span>';
 const puzzle=puzzleOf(state),day=today(),current=state.mode==='daily'&&state.date===day;
 $('modeTag').textContent=state.mode==='daily'?(quiet?`每日批次 · ${fmtDate(state.date)}`:`每日挑战 · ${fmtDate(state.date)}`):(quiet?'批次 · 随机':'自由练习');
 $('sizeTag').textContent=`${state.size} × ${state.size}`+(puzzle.name&&puzzle.name!=='—'?(quiet?` · 批次 ${puzzle.name}`:` · ${puzzle.name}`):'');
 const filled=filledCount(state),target=totalTarget(state);
 $('progressTag').textContent=quiet?`已置位 ${filled} / ${target}`:`已涂黑 ${filled} / ${target}`;
 $('boardHint').textContent=`${state.size} × ${state.size}`;
 $('board').dataset.size=state.size;
 renderClues();
 const grid=$('grid');
 grid.style.gridTemplateColumns=`repeat(${state.size},var(--cell))`;
 grid.innerHTML=state.marks.map((mark,index)=>`<span class="cell ${mark===FILLED?'filled':mark===MARKED?'marked':'empty'}${wrongSet.has(index)?' wrong':''}" data-i="${index}">${cellText(mark)}</span>`).join('');
 $('boardStatus').textContent=noticeText;
 $('fillTag').textContent=`${text('fillLabel')} ${filled} / ${target}`;
 const solved=state.status==='won';
 $('result').hidden=!solved;
 if(solved){
  $('resultTitle').textContent=quiet?'生成完成':'织好了';
  $('resultTag').textContent=`${state.size} × ${state.size}`;
  $('resultText').textContent=quiet?`批次 ${puzzle.name} 的矩阵已还原，索引全部匹配。`:`图案「${puzzle.name}」完成，线索全部对上。`;
 }
 $('legend').innerHTML=quiet
  ?`<div class="legend-row"><span class="cell filled">1</span><p><b>置位</b><span>该位属于矩阵</span></p></div><div class="legend-row"><span class="cell marked">0</span><p><b>清零</b><span>确定该位为 0</span></p></div>`
  :`<div class="legend-row"><span class="cell filled"></span><p><b>涂黑</b><span>参与线索的格子</span></p></div><div class="legend-row"><span class="cell marked"></span><p><b>标记 ×</b><span>确定为空，只是草稿</span></p></div>`;
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
 $('next').textContent=text('next');
}
function startGame(puzzle,mode='practice',date=null){
 state=createGame(puzzle,{mode,date});
 undoStack=[];wrongSet=new Set();noticeText='';dragValue=null;batch=null;
 save();render();
}
function requestPractice(size){
 pendingSize=size;pendingKind='practice';
 if(!canDiscard()){startGame(pickPractice(PUZZLES,size));return;}
 $('newTitle').textContent=text('newTitle');
 $('newHint').textContent=text('newHint');
 $('newDialog').showModal();
}
function canDiscard(){return state.status==='playing'&&filledCount(state)>0;}
function requestDaily(){
 if(state.mode==='daily'&&state.date===today()&&state.status==='playing'){notify(quiet?'今日批次正在进行。':'今天这一题还没做完，继续就好。');render();return;}
 if(canDiscard()){pendingKind='daily';$('newTitle').textContent=text('newTitle');$('newHint').textContent=text('newHint');$('newDialog').showModal();return;}
 startGame(pickDaily(PUZZLES),'daily',today());
}
function doCheck(){
 if(state.status!=='playing')return;
 const list=mistakes(state);
 wrongSet=new Set(list);
 notify(list.length?(quiet?`存在 ${list.length} 处冲突位。`:`有 ${list.length} 格涂错了。`):(quiet?'未发现冲突位。':'目前没有涂错。'));
 render();
 clearTimeout(doCheck.timer);
 doCheck.timer=setTimeout(()=>{wrongSet=new Set();render();},2200);
}
function doUndo(){
 const items=undoStack.pop();
 if(!items)return;
 for(const {index,before} of items)state.marks[index]=before;
 wrongSet=new Set();noticeText='';
 settle();render();
}
function doClear(){
 if(state.status!=='playing')return;
 pushUndo(state.marks.map((mark,index)=>({index,before:mark})).filter(item=>item.before!==EMPTY));
 state.marks=state.marks.map(()=>EMPTY);
 wrongSet=new Set();notify('');
 settle();render();
}
$('view').onclick=()=>{quiet=!quiet;try{localStorage.setItem('pixelweave-view',quiet?'quiet':'standard');}catch{}render();};
$('help').onclick=()=>{
 $('helpTitle').textContent=text('helpTitle');
 $('helpContent').innerHTML=quiet
  ?'<p>每次批次是一个隐藏的 0/1 矩阵，行、列开头的数字是它在该方向的连续 1 的长度。</p><ol><li>点击或按住拖动画格：单独一位置 1。</li><li>右键或长按画格：把该位定为 0，只是辅助标记。</li><li>行、列数字变灰表示该方向已经对上。</li><li>所有位与索引一致时矩阵自动判定完成。</li></ol><p>「校验」会标出与隐藏矩阵不符的 1 位，不会给出答案。批次进度、已完成记录都保存在本浏览器。</p>'
  :'<p>每一局是一个隐藏的像素图，行、列开头的数字是它在这一方向上连续涂黑的长度。</p><ol><li>点击或按住拖动涂黑格子。</li><li>右键或长按把格子标记为 ×，表示确定为空，便于推理。</li><li>行、列数字变灰表示这一方向已经对上了。</li><li>所有格子的涂黑状态与线索一致时自动判定完成。</li></ol><p>「检查」只会标出与答案不符的涂黑格，不会直接给答案。进度和记录都保存在本浏览器，不需要联网。</p>';
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
$('next').onclick=()=>startGame(pickPractice(PUZZLES,state.size,Math.random,state.puzzleId));
$('cancelNew').onclick=()=>$('newDialog').close();
$('confirmNew').onclick=()=>{$('newDialog').close();if(pendingKind==='daily')startGame(pickDaily(PUZZLES),'daily',today());else startGame(pickPractice(PUZZLES,pendingSize));};
$('sizes').onclick=event=>{const button=event.target.closest('[data-size]');if(button)requestPractice(Number(button.dataset.size));};
$('check').onclick=doCheck;
$('undo').onclick=doUndo;
$('clear').onclick=doClear;
$('grid').addEventListener('contextmenu',event=>{
 event.preventDefault();
 const cell=event.target.closest('[data-i]');
 if(!cell||state.status!=='playing')return;
 const index=Number(cell.dataset.i);
 pushUndo([{index,before:state.marks[index]}]);
 apply(index,state.marks[index]===MARKED?EMPTY:MARKED);
 settle();render();
});
$('grid').addEventListener('pointerdown',event=>{
 if(event.button===2)return;
 const cell=event.target.closest('[data-i]');
 if(!cell||state.status!=='playing')return;
 event.preventDefault();
 const index=Number(cell.dataset.i);
 const value=state.marks[index]===FILLED?EMPTY:FILLED;
 batch=[];
 if(apply(index,value))paintCell(index);
 dragValue=value;
 try{$('grid').setPointerCapture(event.pointerId);}catch{}
 clearTimeout(longPress);
 longPress=setTimeout(()=>{
  if(dragValue===null)return;
  if(apply(index,MARKED))paintCell(index);
  dragValue=MARKED;
 },480);
});
$('grid').addEventListener('pointermove',event=>{
 if(dragValue===null)return;
 clearTimeout(longPress);
 const target=document.elementFromPoint(event.clientX,event.clientY);
 const cell=target&&target.closest?target.closest('[data-i]'):null;
 if(!cell||!$('grid').contains(cell))return;
 const index=Number(cell.dataset.i);
 if(apply(index,dragValue))paintCell(index);
});
const endDrag=()=>{
 clearTimeout(longPress);
 if(batch&&batch.length)pushUndo(batch);
 batch=null;dragValue=null;
 settle();render();
};
$('grid').addEventListener('pointerup',endDrag);
$('grid').addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',event=>{
 if(event.altKey&&event.code==='KeyM'&&!event.repeat){event.preventDefault();quiet=!quiet;try{localStorage.setItem('pixelweave-view',quiet?'quiet':'standard');}catch{}render();return;}
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();doUndo();return;}
 if(event.ctrlKey||event.metaKey||event.altKey)return;
 if($('helpDialog').open||$('recordsDialog').open||$('newDialog').open)return;
 if(event.target instanceof HTMLElement&&event.target.closest('button,input,select'))return;
 if(event.key==='c'||event.key==='C')doCheck();
});
render();
