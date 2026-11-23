import {categories,score,upper,total,available,createGame,canRoll,roll,commit,botDecision,validateDecision} from './engine.js';
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game, busy=false, epoch=0, selected=null, config={base:'https://api.openai.com/v1',model:'',key:''}, sound=true, audio;
let quietView=document.documentElement.dataset.view==='quiet', lastStatus=['好运从这里启航','每回合最多掷三次，也可以提前计分。'];
const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{status('存档不可用','浏览器限制了本地存储。本次仍可正常游玩。');}}};
const savedTheme=store.get('yacht-theme')||'system';$('theme').value=savedTheme;document.documentElement.dataset.theme=savedTheme;
$('theme').onchange=()=>{document.documentElement.dataset.theme=$('theme').value;store.set('yacht-theme',$('theme').value);};
function save(){store.set('yacht-game',JSON.stringify(game));}
const quietCategories=['单项 1','单项 2','单项 3','单项 4','单项 5','单项 6','累计','一致 4','分组 3+2','连续 4','连续 5','一致 5'];
const categoryName=key=>{const i=categories.findIndex(c=>c[0]===key);return quietView?quietCategories[i]:categories[i]?.[1];};
const participantName=(p,i=game.players.indexOf(p))=>quietView?`方案 ${String.fromCharCode(65+i)}`:p.name;
function status(title,text){lastStatus=[title,text];$('statusTitle').textContent=quietView?'处理状态':title;$('status').textContent=quietView?quietStatus(text):text;}
function quietStatus(text){
 // Operational failures remain visible; routine flavor text becomes a neutral instruction.
 if(/采样已|失败|超时|尚未配置|无效|限制|检查|最多等待|\[[A-Z_0-9]+\]/.test(text))return text.replaceAll('对局','记录').replaceAll('游戏','页面').replaceAll('骰子','数据').replaceAll('模型回合','处理流程');
 if(game?.done)return '所有记录已完成，可查看汇总或新建记录。';
 if(game&&!isHuman())return '自动处理进行中，请等待当前记录写入。';
 return game?.rolls?`已采样 ${game.rolls}/${game.unlimitedRolls?'∞':3} 次。点击数值锁定，选择统计项后确认写入。`:'点击「更新数据」开始当前记录，统计项将显示可写入数值。';
}
const viewText=[
 ['.brand','数据工作台 <small>本地 / 分析视图</small>'],['.title .eyebrow','LOCAL DATA WORKSPACE'],['h1','采样分析<span>工作记录</span>'],['.title p','本地数据采样、分类汇总与记录管理。'],['#newButton','＋ 新建记录'],['#rulesButton','操作说明'],['#aiButton','接口设置'],['.live-dot','本地处理'],['.table-hint','点击数值锁定 · 选择统计项后确认写入'],['.score-heading h2','统计明细'],['.score-heading>span','SUMMARY'],['.section-label','最近记录 <span>RECENT RECORDS</span>'],['.score-note','前六项累计达到 63，调整值为 35。每项仅可写入一次。'],['footer','本地工作区 <span>自动保存 · 无需登录</span>'],
 ['#setup h2','新建分析记录'],['#setupForm>p:first-of-type','选择处理方式与参与方案。'],['#mode option[value=cpu]','人工 / 自动对照'],['#mode option[value=local]','多方案 · 手动录入'],['#mode option[value=model]','人工 / 接口对照'],['#mode option[value=solo]','单方案 · 手动录入'],['#difficulty option[value=easy]','基础采样'],['#difficulty option[value=normal]','标准采样'],['#difficulty option[value=hard]','扩展采样'],['#count option[value="2"]','2 组'],['#count option[value="3"]','3 组'],['#count option[value="4"]','4 组'],['#setup button[type=submit]','创建记录'],['#modelSetupNote','请在「接口设置」填写凭据。处理请求将消耗接口额度。'],['#aiSettings h2','配置处理接口'],['#aiForm>p:last-of-type','请求通过本机服务转发，发送当前字段、方案名称和统计表。请仅填写你信任的服务。Key 仅在当前页面内存中保存。'],['#results>p','本次记录已汇总。'],['#closeResults','查看明细'],['#again','新建记录'],['#fallbackAI','本次使用本地处理'],['#retryAI','重试请求'],
 ['#rules h2','采样与统计说明'],['#rules>p:nth-of-type(1)','每个方案处理 12 条记录。每条最多采样 3 次；点击字段可锁定或取消锁定。采样后选择一个未写入的统计项，再确认写入。'],['#rules>p:nth-of-type(2)','前六项累计达到 63 时，增加调整值 35。一致 4 允许五个字段相同；分组 3+2 必须严格分为两组。'],['#rules>p:nth-of-type(3)','简洁视图与标准视图共用记录，Alt+M 随时切换。采样规则保持一致。']
].map(([selector,quiet])=>{const el=document.querySelector(selector);return {el,quiet,normal:el.innerHTML};});
const labelText=['mode','difficulty','count'].map((id,i)=>({node:$(id).parentElement.firstChild,normal:$(id).parentElement.firstChild.textContent,quiet:['处理方式','采样等级','方案数量'][i]}));
function applyView(){
 document.documentElement.dataset.view=quietView?'quiet':'standard';document.title=quietView?'数据工作台 · 本地':'快艇骰子 · HGame';
 viewText.forEach(({el,quiet,normal})=>{el.innerHTML=quietView?quiet:normal;});labelText.forEach(({node,normal,quiet})=>{node.textContent=quietView?quiet:normal;});
 $('viewButton').textContent=quietView?'标准视图':'简洁模式';$('viewButton').setAttribute('aria-pressed',String(quietView));
 $('theme').disabled=quietView;$('theme').title=quietView?'简洁模式使用浅色工作区':'主题';
 if(quietView&&audio)audio.suspend();
 $('ruleList').innerHTML=categories.map(([key,name,hint],i)=>`<div class="rule-row"><b>${quietView?quietCategories[i]:name}</b><span>${quietView?['值为 1 的字段之和','值为 2 的字段之和','值为 3 的字段之和','值为 4 的字段之和','值为 5 的字段之和','值为 6 的字段之和','全部字段之和','至少四个相同，取全部之和','严格三项相同加两项相同，取全部之和','四个连续值，计 15','五个连续值，计 30','五个相同值，计 50'][i]:hint}</span></div>`).join('');
 if(game){render();status(...lastStatus);if($('results').open)showResults();}
 if($('setup').open)updateSetup();
 document.documentElement.classList.add('view-ready');
}
function toggleView(){quietView=!quietView;applyView();store.set('yacht-view',quietView?'quiet':'standard');}
$('viewButton').onclick=toggleView;
document.addEventListener('keydown',e=>{
 if(e.altKey&&e.code==='KeyM'&&!e.repeat){e.preventDefault();toggleView();}
 if(e.altKey&&e.shiftKey&&!e.ctrlKey&&!e.metaKey&&e.code==='KeyC'&&!e.repeat){
  if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;
  e.preventDefault();if(!game||busy)return;
  game.unlimitedRolls=!game.unlimitedRolls;render();save();
  status(quietView?'采样额度':'作弊模式',game.unlimitedRolls?(quietView?'扩展采样已启用，Alt+Shift+C 恢复标准额度。':'无限掷骰已开启，Alt+Shift+C 关闭。'):(quietView?'标准采样已恢复，达到三次后需写入当前指标。':'无限掷骰已关闭，达到三次后请计分。'));
 }
});
function beep(){if(!sound||quietView)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.setValueAtTime(480,audio.currentTime);o.frequency.exponentialRampToValueAtTime(170,audio.currentTime+.09);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.start();o.stop(audio.currentTime+.13);}catch{}}
$('soundButton').onclick=()=>{sound=!sound;$('soundButton').textContent=`音效：${sound?'开':'关'}`;};
const pipPositions={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function isHuman(){return game.players[game.turn].type==='human';}
function render(){
 const p=game.players[game.turn], human=isHuman(), can=human&&!busy&&!game.done, unlimited=human&&game.unlimitedRolls===true;
 $('players').innerHTML=game.players.map((p,i)=>`<div class="player ${i===game.turn&&!game.done?'active':''}"><div class="avatar">${p.type==='human'?'♙':p.type==='model'?'✦':'⌘'}</div><div class="player-info"><strong>${esc(participantName(p,i))}</strong><small>${quietView?(p.type==='human'?'手动记录':p.type==='model'?'接口处理':'自动处理'):(p.type==='human'?'本地玩家':p.type==='model'?'API 模型':({easy:'休闲人机',normal:'标准人机',hard:'挑战人机'})[p.level])} · ${Object.keys(p.sheet).length}/12</small></div><b>${total(p.sheet)}</b></div>`).join('');
 $('roundLabel').textContent=`${quietView?'记录':'第'} ${String(Math.min(12,Object.keys(p.sheet).length+1)).padStart(2,'0')} / 12 ${quietView?'':'回合'}`;
 $('turnLabel').textContent=quietView?(game.done?'记录已完成':`${participantName(p)} · ${human?'待处理':'自动处理中'}`):(game.done?'本次航行已完成':`${p.name}，${human?'轮到你了':'正在思考'}`);
 $('instruction').textContent=quietView?(game.done?'汇总已生成':`采样次数 ${game.rolls}/${unlimited?'∞':3} · ${game.rolls?'点击数值切换锁定':'等待更新数据'}`):(game.done?'查看得分，或开启下一次航行':!game.rolls?'掷出五颗骰子，开启这个回合':`已掷 ${game.rolls} 次 · ${unlimited?'无限':Math.max(0,3-game.rolls)} 次机会剩余`);
 $('dice').innerHTML=game.dice.map((d,i)=>`<button class="die ${game.held[i]?'held':''} ${game.rolls?'':'blank'}" data-die="${i}" aria-label="${quietView?'字段':'第'} ${i+1} ${quietView?'':'颗'}：${game.rolls?d:(quietView?'待采样':'未掷')}，${game.held[i]?(quietView?'已锁定':'已保留'):(quietView?'未锁定':'未保留')}" aria-pressed="${game.held[i]}" ${!can||!game.rolls||!canRoll(game)?'disabled':''}>${quietView?`<span class="field-label">字段 ${String(i+1).padStart(2,'0')}</span><span class="field-value">${game.rolls?d:'—'}</span><span class="field-state">${game.held[i]?'已锁定':'自动'}</span>`:pipPositions[d].map(n=>`<span class="pip" style="grid-area:${Math.ceil(n/3)}/${(n-1)%3+1}"></span>`).join('')}</button>`).join('');
 $('rollProgress').innerHTML=[1,2,3].map(n=>`<i class="${game.rolls>=n?'used':''}"></i>`).join('');
 $('rollButton').disabled=!can||!canRoll(game)||(game.rolls>0&&game.held.every(Boolean));
 $('rollButton').title='Alt+Shift+C · '+(game.unlimitedRolls?(quietView?'扩展采样':'无限掷骰'):(quietView?'标准采样':'标准规则'));
 $('rollButton').innerHTML=quietView?(game.done?'处理完成':busy?'处理中…':game.rolls?'重新采样':'更新数据'):(game.done?'对局结束':busy?'正在进行…':`${game.rolls?'再掷一次':'掷骰子'} <span>↻</span>`);
 const head=`<thead><tr><th>${quietView?'统计项':'计分项目'}</th>${game.players.map((p,i)=>`<th title="${esc(participantName(p,i))}">${esc(participantName(p,i))}</th>`).join('')}</tr></thead>`;
 const summary=(label,fn,cls='summary')=>`<tr class="${cls}"><td>${label}</td>${game.players.map(p=>`<td>${fn(p.sheet)}</td>`).join('')}</tr>`;
 let rows='';categories.forEach(([key,label,hint],index)=>{
  if(index===6){rows+=summary(quietView?'分类小计':'上半区小计',s=>`${upper(s)} <small>/ 63</small>`);rows+=summary(quietView?'调整值':'奖励',s=>upper(s)>=63?'+35':'—');}
  rows+=`<tr><td title="${quietView?categoryName(key):esc(hint)}">${!quietView&&index<6?`<small>${['⚀','⚁','⚂','⚃','⚄','⚅'][index]}</small>`:''}${categoryName(key)}</td>${game.players.map((p,i)=>{const filled=p.sheet[key]!==undefined;const points=score(game.dice,key);return `<td>${filled?p.sheet[key]:i===game.turn&&game.rolls&&!game.done?`<button data-category="${key}" class="score-value ${points===0?'zero':''} ${selected===key?'selected':''}" ${!can?'disabled':''} aria-label="${categoryName(key)}，${points}${quietView?'':' 分'}">${points}</button>`:'<span style="opacity:.25">—</span>'}</td>`;}).join('')}</tr>`;
 });
 $('scorecard').innerHTML=head+`<tbody>${rows}${summary(quietView?'合计':'总分',total,'total')}</tbody>`;
 document.getElementById('scoreConfirm')?.remove();
 if(selected&&can){const box=document.createElement('div');box.id='scoreConfirm';const points=score(game.dice,selected);box.innerHTML=`<button class="primary" id="confirmScore">${quietView?'确认写入':`确认${points===0?'划掉':'填入'}`}「${categoryName(selected)}」 · ${points}${quietView?'':' 分'}</button>`;$('scorecard').closest('.score-scroll').after(box);$('confirmScore').onclick=()=>finishTurn(selected);}
 $('history').innerHTML=game.log.length?game.log.slice(0,4).map(l=>`<div class="history-entry"><span>${quietView?'本地记录':esc(l.name)} · ${l.dice.join(' · ')}</span><b>${categoryName(l.key)} +${l.points}</b></div>`).join(''):`<p class="empty">${quietView?'暂无记录':'第一笔得分，等你写下。'}</p>`;
}
$('dice').onclick=e=>{const b=e.target.closest('[data-die]');if(!b||b.disabled)return;game.held[+b.dataset.die]=!game.held[+b.dataset.die];beep();save();render();};
$('scorecard').onclick=e=>{const b=e.target.closest('[data-category]');if(!b||b.disabled)return;selected=b.dataset.category;render();};
async function doRoll(){
 if(busy||!canRoll(game))return;
 const token=epoch;busy=true;selected=null;render();$('dice').classList.add('rolling');beep();
 await new Promise(r=>setTimeout(r,420));if(token!==epoch)return;
 roll(game);busy=false;$('dice').classList.remove('rolling');save();render();
 if(game.rolls===3&&!canRoll(game))status('选择这一手的归宿','掷骰机会已用完，选择计分项后确认填入。');
 else status('留住你想要的点数','点击骰子保留，再掷一次；也可以直接选择计分项。');
}
$('rollButton').onclick=()=>doRoll();
function finishTurn(key){
 const p=game.players[game.turn],name=p.name,points=commit(game,key);selected=null;save();render();
 status(`${name} · ${categories.find(c=>c[0]===key)[1]} +${points}`,game.done?'全部计分已完成。感谢这次相聚。':`下一位：${game.players[game.turn].name}。`);
 if(game.done)showResults();else scheduleBot();
}
let botScheduled=false;
function scheduleBot(){if(game.done||isHuman()||busy||botScheduled)return;botScheduled=true;const token=epoch;setTimeout(()=>{botScheduled=false;if(token===epoch)runBot();},750);}
async function runBot(forceLocal=false){
 if(game.done||isHuman()||busy)return;
 const token=epoch;const p=game.players[game.turn];$('recovery').hidden=true;
 if(!game.rolls){await doRoll();if(token!==epoch)return;}
 busy=true;render();let action;
 try{
  if(p.type==='model'&&!forceLocal){
   if(!config.key||!config.model)throw new Error('尚未配置模型。请在「模型设置」填写 API Key 与模型名称，然后重试。');
   status('模型正在思考','正在请求决策；临时失败会自动重试一次，最多等待约 95 秒。');
   const response=await fetch('./api/decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,game}),signal:AbortSignal.timeout(100000)});
      let data;
   try{data=await response.json();}catch{throw new Error('[LOCAL_RESPONSE] 本机服务返回了无效响应，请重启游戏服务后重试。');}
   if(token!==epoch)return;
   if(!response.ok)throw new Error(`${data.code?`[${data.code}] `:''}${data.error||'模型请求失败'}${data.attempts>1?'（已尝试两次）':''}${data.requestId?` · 错误编号 ${data.requestId}`:''}`);
   action=validateDecision(data.action,game);
  }else{await new Promise(r=>setTimeout(r,120));if(token!==epoch)return;action=botDecision(game,p.level||'hard');}
  if(token!==epoch)return;busy=false;
  if(action.type==='score')finishTurn(action.category);
  else{game.held=game.dice.map((_,i)=>action.keep.includes(i));render();status(`${p.name} 保留了 ${action.keep.length} 颗骰子`,'继续掷骰，寻找更好的组合。');await new Promise(r=>setTimeout(r,650));if(token!==epoch)return;await doRoll();if(token===epoch){if(forceLocal)runBot(true);else scheduleBot();}}
 }catch(error){if(token!==epoch)return;busy=false;render();status('模型回合已暂停',['TimeoutError','AbortError'].includes(error.name)?'[LOCAL_TIMEOUT] 等待本机服务超时，请重试；多次超时可重启游戏服务。':error instanceof TypeError?'[LOCAL_NETWORK] 连接本机服务失败，请确认启动窗口仍在运行。':error.message||'连接失败，请重试。');$('recovery').hidden=false;}
}
$('retryAI').onclick=()=>runBot();$('fallbackAI').onclick=()=>runBot(true);
function showResults(){const rank=[...game.players].sort((a,b)=>total(b.sheet)-total(a.sheet));const winners=rank.filter(p=>total(p.sheet)===total(rank[0].sheet));$('winner').textContent=quietView?'记录汇总':game.players.length===1?`本次得分 ${total(rank[0].sheet)}`:`${winners.map(p=>p.name).join('、')}${winners.length>1?' 并列获胜':' 获胜'}`;$('ranking').innerHTML=rank.map(p=>`<div class="rank"><span>${esc(participantName(p))}</span><b>${total(p.sheet)}${quietView?'':' 分'}</b></div>`).join('');if(!$('results').open)$('results').showModal();}
$('closeResults').onclick=()=>$('results').close();$('again').onclick=()=>{$('results').close();openSetup();};
function updateSetup(){const mode=$('mode').value;$('difficultyLabel').hidden=mode!=='cpu';$('countLabel').hidden=mode!=='local';$('modelSetupNote').hidden=mode!=='model';const n=mode==='local'?+$('count').value:1;const old=[...$('names').querySelectorAll('input')].map(i=>i.value);$('names').innerHTML=Array.from({length:n},(_,i)=>`<label>${quietView?'方案':'玩家'} ${i+1} 名称<input required maxlength="16" name="player${i}" value="${esc(old[i]|| (quietView?`方案 ${String.fromCharCode(65+i)}`:i===0?'你':`玩家 ${i+1}`))}"></label>`).join('');}
$('mode').onchange=updateSetup;$('count').onchange=updateSetup;
function openSetup(){$('cancelSetup').hidden=!game;updateSetup();$('setup').showModal();}
$('newButton').onclick=openSetup;$('cancelSetup').onclick=()=>$('setup').close();
$('setup').addEventListener('cancel',e=>{if(!game)e.preventDefault();});
$('setupForm').onsubmit=e=>{e.preventDefault();const mode=$('mode').value;const players=[...$('names').querySelectorAll('input')].map((i,n)=>({name:i.value.trim()||`玩家 ${n+1}`,type:'human'}));if(mode==='cpu')players.push({name:'领航员',type:'cpu',level:$('difficulty').value});if(mode==='model')players.push({name:'AI 船长',type:'model',level:'hard'});epoch++;busy=false;botScheduled=false;selected=null;$('recovery').hidden=true;$('dice').classList.remove('rolling');game=createGame(players);save();render();$('setup').close();status('好运从这里启航','点击「掷骰子」开始。未填的计分格会显示当前可得分数。');};
$('rulesButton').onclick=()=>$('rules').showModal();$('closeRules').onclick=()=>$('rules').close();$('ruleList').innerHTML=categories.map(([,name,hint])=>`<div class="rule-row"><b>${name}</b><span>${hint}</span></div>`).join('');
$('aiButton').onclick=()=>{$('base').value=config.base;$('model').value=config.model;$('apiKey').value=config.key;$('aiSettings').showModal();};
$('closeAI').onclick=()=>$('aiSettings').close();
$('provider').onchange=()=>{const p=$('provider').value;$('base').value=p==='openai'?'https://api.openai.com/v1':p==='deepseek'?'https://api.deepseek.com':'http://127.0.0.1:11434/v1';$('model').value=p==='deepseek'?'deepseek-flash':'';};
$('aiForm').onsubmit=e=>{e.preventDefault();config={base:$('base').value.trim(),model:$('model').value.trim(),key:$('apiKey').value.trim()};$('aiSettings').close();status('模型配置已应用','配置仅在本次页面会话中有效。选择「单人 · 对战 AI 模型」开始新对局；已暂停的模型回合可点击重试。');};
applyView();
try{const data=JSON.parse(store.get('yacht-game'));if(data?.version===1&&Array.isArray(data.players)&&data.players.length>=1&&data.players.length<=4&&Number.isInteger(data.turn)&&data.turn>=0&&data.turn<data.players.length&&Array.isArray(data.dice)&&data.dice.length===5&&data.dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6)&&Array.isArray(data.held)&&data.held.length===5&&Number.isSafeInteger(data.rolls)&&data.rolls>=0&&Array.isArray(data.log)&&data.players.every(p=>typeof p.name==='string'&&['human','cpu','model'].includes(p.type)&&p.sheet&&Object.entries(p.sheet).every(([k,v])=>categories.some(c=>c[0]===k)&&Number.isFinite(v)&&v>=0&&v<=50)))game={...data,unlimitedRolls:false};}catch{}
if(game){render();status('已恢复上次的航行','对局自动保存在此浏览器中。模型 Key 不会存档，需重新填写。');if(game.done)showResults();else scheduleBot();}
else{game=createGame([{name:'你',type:'human'},{name:'领航员',type:'cpu',level:'normal'}]);render();openSetup();}
