import {LENGTH,MAX_TRIES,CATEGORIES,WORDS,WORD_INDEX,RuleError,createGame,submit,dayKey,validSave,recordResult,validRecord,summarize,meta} from './engine.js';
const $=id=>document.getElementById(id);
const KEY_ROWS=[['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l'],['enter','z','x','c','v','b','n','m','del']];
const copy={standard:{eyebrow:'SIX TRIES. FIVE LETTERS.',title:'词条校验',subtitle:'六次机会，读出一个五位的词条。',view:'简洁模式',help:'玩法说明',newGame:'新的一局',recordsButton:'本地战绩',dailyButton:'每日挑战',dailyTitle:'每日挑战',dailyPlay:'开始今日',dailyRecords:'今日战绩',boardTitle:'尝试记录',legendTitle:'怎么读反馈',legendHint:'绿色表示位置正确，橙色表示词里有但位置不对，灰色表示词里没有这个字母。重复字母只按词中实际数量匹配。',statsTitle:'本地统计',statDoneLabel:'完成',statRateLabel:'通过率',statStreakLabel:'连续通过',poolTitle:'词域',poolHint:'先看本题属于哪个领域，再在领域内想词，比随机猜有效得多。',footer:'词条校验 · 离线单人 · 原创规则与界面',footerTag:'自动保存 · Alt+M',helpTitle:'玩法说明',recordsTitle:'本地战绩',newTitle:'开始新的一局？',newHint:'将覆盖当前自动存档。',cancelNew:'继续当前进度',confirmNew:'确认新建',continueDaily:'继续今日'},quiet:{eyebrow:'IDENTIFIER CHECK / BUILD LOG',title:'标识符校验',subtitle:'输入 5 位标识符后回车，6 次内完成逐位比对。',view:'标准视图',help:'手册',newGame:'新会话',recordsButton:'运行记录',dailyButton:'每日构建',dailyTitle:'每日构建',dailyPlay:'执行今日',dailyRecords:'今日记录',boardTitle:'比对结果',legendTitle:'输出标记',legendHint:'实心块表示该位完全匹配；半亮块表示符号存在但偏移不符；空块表示未出现。重复符号按实际数量匹配。',statsTitle:'运行统计',statDoneLabel:'已运行',statRateLabel:'通过率',statStreakLabel:'连续通过',poolTitle:'符号表',poolHint:'上方会标出目标所属命名空间；按分区回忆标识符比盲猜高效。',footer:'本地校验工具 · 单人 · 不联网',footerTag:'自动快照 · Alt+M',helpTitle:'手册',recordsTitle:'运行记录',newTitle:'重启会话？',newHint:'当前会话的快照将被覆盖。',cancelNew:'保留当前会话',confirmNew:'确认重启',continueDaily:'继续构建'}};
let state=null,quiet=document.documentElement.dataset.view==='quiet',typed='',noticeCode='',records=[],revealRow=-1,pendingNew='practice';
try{const saved=JSON.parse(localStorage.getItem('wordcheck-save'));if(validSave(saved))state=saved;}catch{}
state??=createGame();
try{const saved=JSON.parse(localStorage.getItem('wordcheck-records'));if(Array.isArray(saved))records=saved.filter(validRecord).slice(0,50);}catch{}
const text=key=>copy[quiet?'quiet':'standard'][key];
const fmtDate=key=>key?`${key.slice(0,4)}-${key.slice(4,6)}-${key.slice(6,8)}`:'';
const today=()=>dayKey();
function message(code){const table={ended:['这一局已经结束了。','会话已结束。'],length:['需要 5 个英文字母。','标识符长度不符：需要 5 位。'],used:['这个词已经试过了。','该标识符已提交过。'],exhausted:['机会已经用完了。','重试预算已用尽。'],answer:['这个词条暂时不能使用。','标识符不在符号表中。']};return (table[code]||['操作没有完成。','操作未完成。'])[quiet?1:0];}
function save(){try{localStorage.setItem('wordcheck-save',JSON.stringify(state));}catch{}}
function saveRecords(){try{localStorage.setItem('wordcheck-records',JSON.stringify(records));}catch{}}
function finish(){records=recordResult(records,state);saveRecords();}
function notify(code){noticeCode=code;}
function noticeLine(){
 if(!noticeCode)return '';
 const pairs={unknown:['这个词不在词库，仍会按字母比对。','未声明标识符：已按字节逐位比对。'],copied:['结果已复制到剪贴板。','摘要已复制到剪贴板。'],copyFail:['复制失败，请手动复制。','复制失败，请手动选择文本。'],dailyPlaying:['今天这一题还没做完，继续就好。','今日构建正在进行。']};
 const pair=pairs[noticeCode];
 return pair?pair[quiet?1:0]:message(noticeCode);
}
function keyState(){
 const map={},rank={miss:0,near:1,hit:2};
 for(const row of state.rows)row.marks.forEach((mark,i)=>{const ch=row.word[i];if(!(ch in map)||rank[mark]>rank[map[ch]])map[ch]=mark;});
 return map;
}
function boardHTML(){
 let html='';
 for(let r=0;r<MAX_TRIES;r++){
  const row=state.rows[r];
  if(row)html+=`<div class="row${r===revealRow?' reveal':''}">`+row.marks.map((mark,i)=>`<div class="cell ${mark}" style="--i:${i}">${row.word[i].toUpperCase()}</div>`).join('')+'</div>';
  else if(r===state.rows.length&&state.status==='playing')html+='<div class="row typing">'+Array.from({length:LENGTH},(_,i)=>`<div class="cell${i===typed.length?' caret':''}">${(typed[i]||'').toUpperCase()}</div>`).join('')+'</div>';
  else html+='<div class="row">'+'<div class="cell"></div>'.repeat(LENGTH)+'</div>';
 }
 return html;
}
function keyboardHTML(){
 const marks=keyState();
 return KEY_ROWS.map(row=>`<div class="key-row">`+row.map(key=>{
  if(key==='enter')return `<button class="key wide" data-key="enter">${quiet?'ENTER':'回车'}</button>`;
  if(key==='del')return `<button class="key wide" data-key="del">${quiet?'DEL':'退格'}</button>`;
  return `<button class="key ${marks[key]||''}" data-key="${key}">${key.toUpperCase()}</button>`;
 }).join('')+'</div>').join('');
}
function legendHTML(){
 const items=quiet
  ?[['hit','A','位匹配','该位与目标完全一致'],['near','A','符号存在 · 偏移不符','出现在目标里，但不在这一位'],['miss','A','未出现','目标里没有这个符号']]
  :[['hit','A','位置正确','这个字母就在这里'],['near','A','词里有，位置不对','换个位置试试'],['miss','A','词里没有','这个字母可以排除']];
 return items.map(([mark,letter,title,note])=>`<div class="legend-item"><div class="cell ${mark}">${letter}</div><p><b>${title}</b><span>${note}</span></p></div>`).join('');
}
function distHTML(s){
 const max=Math.max(1,...s.dist);
 return s.dist.map((count,i)=>`<div class="dist-row"><span>${i+1}</span><div class="bar"><i style="width:${count?Math.max(10,count*100/max):0}%"></i></div><b>${count}</b></div>`).join('');
}
function render(){
 document.documentElement.dataset.view=quiet?'quiet':'standard';
 document.title=quiet?'构建日志 · 本地':'词条校验 · HGame';
 for(const key of ['eyebrow','title','subtitle','view','help','newGame','recordsButton','dailyButton','dailyTitle','dailyRecords','boardTitle','legendTitle','legendHint','statsTitle','statDoneLabel','statRateLabel','statStreakLabel','poolTitle','poolHint','footer','footerTag','helpTitle','recordsTitle'])$(key).textContent=text(key);
 $('brand').innerHTML=quiet?'LOCAL SESSION':'H▧GAME <span>/ 004</span>';
 const item=meta(state.answer),day=today(),current=state.mode==='daily'&&state.date===day;
 $('modeTag').textContent=state.mode==='daily'?(quiet?`每日构建 · ${fmtDate(state.date)}`:`每日挑战 · ${fmtDate(state.date)}`):(quiet?'会话 · 随机':'自由练习');
 $('fieldTag').textContent=(quiet?'命名空间 · ':'词域 · ')+(item?CATEGORIES[item.c]:'');
 $('triesTag').textContent=state.status==='playing'?(quiet?`重试 ${state.rows.length+1} / ${MAX_TRIES}`:`第 ${state.rows.length+1} / ${MAX_TRIES} 次`):(quiet?'会话结束':'本局结束');
 $('boardHint').textContent=state.status==='playing'?(quiet?`剩余预算 ${MAX_TRIES-state.rows.length}`:`还剩 ${MAX_TRIES-state.rows.length} 次`):'';
 $('board').innerHTML=boardHTML();
 $('keyboard').innerHTML=keyboardHTML();
 $('keyboardHint').textContent=quiet?'输入 5 位标识符后按 ENTER；DEL 修改。':'输入 5 个英文字母后按回车；退格键可以修改。';
 $('notice').textContent=noticeLine();
 $('legend').innerHTML=legendHTML();
 const s=summarize(records);
 $('statDone').textContent=s.done;$('statRate').textContent=s.done?s.rate+'%':'—';$('statStreak').textContent=s.streak;
 $('statsTag').textContent=quiet?'最近 50 次':'最近 50 局';
 $('dist').innerHTML=distHTML(s);
 $('pool').innerHTML=Object.entries(CATEGORIES).map(([key,name])=>`<div class="pool-row${item&&item.c===key?' active':''}"><span>${name}</span><b>${WORDS.filter(word=>word.c===key).length}</b></div>`).join('');
 const done=records.find(r=>r.mode==='daily'&&r.date===day);
 $('dailyHint').textContent=done?(quiet?`今日已执行 · ${done.won?`通过（第 ${done.attempts} 次）`:'未通过'}`:`今日已完成 · ${done.won?`第 ${done.attempts} 次猜中`:'未猜中'}`):(quiet?'按本地日期生成的固定标识符，每天一个。':'每天一题，北京时间零点换新。');
 $('dailyPlay').textContent=current&&state.status==='playing'?text('continueDaily'):text('dailyPlay');
 $('daily').classList.toggle('active',Boolean(current&&state.status==='playing'));
 const over=state.status!=='playing';
 $('result').hidden=!over;
 if(over){
  $('resultTitle').textContent=state.status==='won'?(quiet?'校验通过':'猜中了'):(quiet?'校验失败':'没猜中');
  $('resultTag').textContent=state.mode==='daily'?fmtDate(state.date):(quiet?'会话':'练习');
  $('resultText').textContent=state.status==='won'?(quiet?`在 ${state.rows.length} 次重试内完成比对。`:`第 ${state.rows.length} 次猜中。`):(quiet?'重试预算已用尽。':'六次机会用完了。');
  $('answerLine').textContent=(quiet?'目标标识符：':'答案是：')+state.answer.toUpperCase()+(item?` · ${item.n}`:'');
 }
 revealRow=-1;
}
function toggle(){
 quiet=!quiet;
 try{localStorage.setItem('wordcheck-view',quiet?'quiet':'standard');}catch{}
 render();
}
function type(letter){
 if(state.status!=='playing'){notify(message('ended'));render();return;}
 if(typed.length>=LENGTH)return;
 typed+=letter;notify('');render();
}
function backspace(){
 if(!typed){notify('');return;}
 typed=typed.slice(0,-1);notify('');render();
}
function commit(){
 if(state.status!=='playing'){notify('ended');render();return;}
 if(typed.length!==LENGTH){notify('length');render();return;}
 const word=typed.toLowerCase(),index=state.rows.length,unknown=!WORD_INDEX.has(word);
 try{submit(state,word);}catch(error){notify(error instanceof RuleError?error.code:'answer');render();return;}
 typed='';revealRow=index;
 if(unknown&&state.status==='playing')notify('unknown');
 else notify('');
 save();
 if(state.status!=='playing')finish();
 render();
}
function startNew(kind){
 state=kind==='daily'?createGame({mode:'daily'}):createGame();
 typed='';noticeCode='';revealRow=-1;
 save();render();
}
function requestNew(kind){
 if(kind==='daily'&&state.mode==='daily'&&state.date===today()&&state.status==='playing'){notify('dailyPlaying');render();return;}
 if(state.status!=='playing'){startNew(kind);return;}
 pendingNew=kind;
 $('newTitle').textContent=kind==='daily'?(quiet?'开始今日构建？':'开始今天的挑战？'):text('newTitle');
 $('newHint').textContent=text('newHint');
 $('newError').textContent='';
 $('newDialog').showModal();
}
function summaryText(){
 const mark=row=>row.marks.map(value=>value==='hit'?'#':value==='near'?'+':'-').join('');
 const block=row=>row.marks.map(value=>value==='hit'?'🟩':value==='near'?'🟨':'⬜').join('');
 const label=state.mode==='daily'?(quiet?`每日构建 ${fmtDate(state.date)}`:`每日挑战 ${fmtDate(state.date)}`):(quiet?'会话':'练习');
 const score=state.status==='won'?`${state.rows.length}/${MAX_TRIES}`:`X/${MAX_TRIES}`;
 return `${quiet?'标识符校验':'词条校验'} · ${label} · ${score}\n`+state.rows.map(quiet?mark:block).join('\n');
}
$('view').onclick=toggle;
$('help').onclick=()=>{
 $('helpTitle').textContent=text('helpTitle');
 $('helpContent').innerHTML=quiet
  ?'<p>每次会话生成一个 5 位标识符，取值来自编程领域的常用符号。</p><ol><li>输入 5 位后按 ENTER 提交。</li><li>每位输出一个标记：位匹配 / 符号存在但偏移不符 / 未出现。</li><li>6 次重试内命中即校验通过。</li><li>标题旁会标出命名空间，按分区回忆比盲猜高效。</li></ol><p>未登记的标识符也能提交并参与比对，只会标注为未声明。每日构建按本地日期固定，会话模式随机。快照保存在本浏览器。</p>'
  :'<p>目标是猜出一个 5 位英文词条，全部来自编程领域的常用词。</p><ol><li>输入 5 个英文字母，按回车提交。</li><li>每一格给出反馈：位置正确、词里有但位置不对、词里没有。</li><li>6 次之内猜中即通过。</li><li>上方会标出本题的词域，先按领域回忆，比随机猜有效。</li></ol><p>不在词库里的组合也能提交并正常比对，只会标注为未收录。每日挑战按北京时间生成固定词条；练习模式随机出题。进度自动保存在本浏览器。</p>';
 $('helpDialog').showModal();
};
$('closeHelp').onclick=()=>$('helpDialog').close();
$('recordsButton').onclick=()=>{
 const s=summarize(records);
 $('recordsSummary').textContent=quiet?`共 ${s.done} 次运行，通过 ${s.wins} 次。`:`共 ${s.done} 局，通过 ${s.wins} 局。`;
 $('recordsList').innerHTML=records.length?records.map(item=>`<div class="record"><span>${item.mode==='daily'?(quiet?'每日构建':'每日'):(quiet?'会话':'练习')}</span><span>${item.mode==='daily'?fmtDate(item.date):'—'}</span><b>${item.word.toUpperCase()}</b><span>${item.won?`${item.attempts}/${MAX_TRIES}`:'X'}</span></div>`).join(''):`<p class="empty">${quiet?'暂无运行记录。':'还没有记录。'}</p>`;
 $('recordsDialog').showModal();
};
$('closeRecords').onclick=()=>$('recordsDialog').close();
$('dailyPlay').onclick=()=>requestNew('daily');
$('dailyRecords').onclick=()=>$('recordsButton').click();
$('newGame').onclick=()=>requestNew('practice');
$('again').onclick=()=>startNew(state.mode==='daily'&&state.date===today()?'daily':'practice');
$('cancelNew').onclick=()=>$('newDialog').close();
$('confirmNew').onclick=()=>{$('newDialog').close();startNew(pendingNew);};
$('copy').onclick=async()=>{
 const value=summaryText();
 try{await navigator.clipboard.writeText(value);notify('copied');}
 catch{notify('copyFail');}
 render();
};
$('keyboard').onclick=event=>{
 const button=event.target.closest('[data-key]');
 if(!button)return;
 const key=button.dataset.key;
 if(key==='enter')commit();
 else if(key==='del')backspace();
 else type(key);
 if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
};
document.addEventListener('keydown',event=>{
 if(event.altKey&&event.code==='KeyM'&&!event.repeat){event.preventDefault();toggle();return;}
 if(event.ctrlKey||event.metaKey||event.altKey)return;
 if($('helpDialog').open||$('recordsDialog').open||$('newDialog').open)return;
 if(event.target instanceof HTMLElement&&event.target.closest('button,input,select'))return;
 if(event.key==='Enter'){event.preventDefault();commit();}
 else if(event.key==='Backspace'){event.preventDefault();backspace();}
 else if(/^[a-zA-Z]$/.test(event.key)){event.preventDefault();type(event.key.toLowerCase());}
});
if(state.status!=='playing'){finish();save();}
render();
