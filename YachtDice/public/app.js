import {categories,score,upper,total,available,createGame,roll,commit,botDecision,validateDecision} from './engine.js';
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game, busy=false, epoch=0, selected=null, config={base:'https://api.openai.com/v1',model:'',key:''}, sound=true, audio;
const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{status('存档不可用','浏览器限制了本地存储。本次仍可正常游玩。');}}};
const savedTheme=store.get('yacht-theme')||'system';$('theme').value=savedTheme;document.documentElement.dataset.theme=savedTheme;
$('theme').onchange=()=>{document.documentElement.dataset.theme=$('theme').value;store.set('yacht-theme',$('theme').value);};
function save(){store.set('yacht-game',JSON.stringify(game));}
function status(title,text){$('statusTitle').textContent=title;$('status').textContent=text;}
function beep(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.setValueAtTime(480,audio.currentTime);o.frequency.exponentialRampToValueAtTime(170,audio.currentTime+.09);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.start();o.stop(audio.currentTime+.13);}catch{}}
$('soundButton').onclick=()=>{sound=!sound;$('soundButton').textContent=`音效：${sound?'开':'关'}`;};
const pipPositions={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function isHuman(){return game.players[game.turn].type==='human';}
function render(){
 const p=game.players[game.turn], human=isHuman(), can=human&&!busy&&!game.done;
 $('players').innerHTML=game.players.map((p,i)=>`<div class="player ${i===game.turn&&!game.done?'active':''}"><div class="avatar">${p.type==='human'?'♙':p.type==='model'?'✦':'⌘'}</div><div class="player-info"><strong>${esc(p.name)}</strong><small>${p.type==='human'?'本地玩家':p.type==='model'?'API 模型':({easy:'休闲人机',normal:'标准人机',hard:'挑战人机'})[p.level]} · ${Object.keys(p.sheet).length}/12</small></div><b>${total(p.sheet)}</b></div>`).join('');
 $('roundLabel').textContent=`第 ${String(Math.min(12,Object.keys(p.sheet).length+1)).padStart(2,'0')} / 12 回合`;
 $('turnLabel').textContent=game.done?'本次航行已完成':`${p.name}，${human?'轮到你了':'正在思考'}`;
 $('instruction').textContent=game.done?'查看得分，或开启下一次航行':!game.rolls?'掷出五颗骰子，开启这个回合':`已掷 ${game.rolls} 次 · ${3-game.rolls} 次机会剩余`;
 $('dice').innerHTML=game.dice.map((d,i)=>`<button class="die ${game.held[i]?'held':''} ${game.rolls?'':'blank'}" data-die="${i}" aria-label="第 ${i+1} 颗：${game.rolls?d:'未掷'}，${game.held[i]?'已保留':'未保留'}" aria-pressed="${game.held[i]}" ${!can||!game.rolls||game.rolls>=3?'disabled':''}>${pipPositions[d].map(n=>`<span class="pip" style="grid-area:${Math.ceil(n/3)}/${(n-1)%3+1}"></span>`).join('')}</button>`).join('');
 $('rollProgress').innerHTML=[1,2,3].map(n=>`<i class="${game.rolls>=n?'used':''}"></i>`).join('');
 $('rollButton').disabled=!can||game.rolls>=3||(game.rolls>0&&game.held.every(Boolean));
 $('rollButton').innerHTML=game.done?'对局结束':busy?'正在进行…':`${game.rolls?'再掷一次':'掷骰子'} <span>↻</span>`;
 const head=`<thead><tr><th>计分项目</th>${game.players.map(p=>`<th title="${esc(p.name)}">${esc(p.name)}</th>`).join('')}</tr></thead>`;
 const summary=(label,fn,cls='summary')=>`<tr class="${cls}"><td>${label}</td>${game.players.map(p=>`<td>${fn(p.sheet)}</td>`).join('')}</tr>`;
 let rows='';categories.forEach(([key,label,hint],index)=>{
  if(index===6){rows+=summary('上半区小计',s=>`${upper(s)} <small>/ 63</small>`);rows+=summary('奖励',s=>upper(s)>=63?'+35':'—');}
  rows+=`<tr><td title="${esc(hint)}">${index<6?`<small>${['⚀','⚁','⚂','⚃','⚄','⚅'][index]}</small>`:''}${label}</td>${game.players.map((p,i)=>{const filled=p.sheet[key]!==undefined;const points=score(game.dice,key);return `<td>${filled?p.sheet[key]:i===game.turn&&game.rolls&&!game.done?`<button data-category="${key}" class="score-value ${points===0?'zero':''} ${selected===key?'selected':''}" ${!can?'disabled':''} aria-label="${label}，${points} 分">${points}</button>`:'<span style="opacity:.25">—</span>'}</td>`;}).join('')}</tr>`;
 });
 $('scorecard').innerHTML=head+`<tbody>${rows}${summary('总分',total,'total')}</tbody>`;
 document.getElementById('scoreConfirm')?.remove();
 if(selected&&can){const box=document.createElement('div');box.id='scoreConfirm';const points=score(game.dice,selected);box.innerHTML=`<button class="primary" id="confirmScore">确认${points===0?'划掉':'填入'}「${categories.find(c=>c[0]===selected)[1]}」 · ${points} 分</button>`;$('scorecard').closest('.score-scroll').after(box);$('confirmScore').onclick=()=>finishTurn(selected);}
 $('history').innerHTML=game.log.length?game.log.slice(0,4).map(l=>`<div class="history-entry"><span>${esc(l.name)} · ${l.dice.join(' · ')}</span><b>${categories.find(c=>c[0]===l.key)?.[1]} +${l.points}</b></div>`).join(''):'<p class="empty">第一笔得分，等你写下。</p>';
}
$('dice').onclick=e=>{const b=e.target.closest('[data-die]');if(!b||b.disabled)return;game.held[+b.dataset.die]=!game.held[+b.dataset.die];beep();save();render();};
$('scorecard').onclick=e=>{const b=e.target.closest('[data-category]');if(!b||b.disabled)return;selected=b.dataset.category;render();};
async function doRoll(){
 const token=epoch;busy=true;selected=null;render();$('dice').classList.add('rolling');beep();
 await new Promise(r=>setTimeout(r,420));if(token!==epoch)return;
 roll(game);busy=false;$('dice').classList.remove('rolling');save();render();
 if(game.rolls===3)status('选择这一手的归宿','掷骰机会已用完，选择计分项后确认填入。');
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
   status('模型正在思考','正在向配置的接口请求决策，最多等待 45 秒。');
   const response=await fetch('/api/decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,game}),signal:AbortSignal.timeout(50000)});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'模型请求失败');action=validateDecision(data.action,game);
  }else{await new Promise(r=>setTimeout(r,120));if(token!==epoch)return;action=botDecision(game,p.level||'hard');}
  if(token!==epoch)return;busy=false;
  if(action.type==='score')finishTurn(action.category);
  else{game.held=game.dice.map((_,i)=>action.keep.includes(i));render();status(`${p.name} 保留了 ${action.keep.length} 颗骰子`,'继续掷骰，寻找更好的组合。');await new Promise(r=>setTimeout(r,650));if(token!==epoch)return;await doRoll();if(token===epoch){if(forceLocal)runBot(true);else scheduleBot();}}
 }catch(error){if(token!==epoch)return;busy=false;render();status('模型回合已暂停',error.message||'连接失败，请重试。');$('recovery').hidden=false;}
}
$('retryAI').onclick=()=>runBot();$('fallbackAI').onclick=()=>runBot(true);
function showResults(){const rank=[...game.players].sort((a,b)=>total(b.sheet)-total(a.sheet));const winners=rank.filter(p=>total(p.sheet)===total(rank[0].sheet));$('winner').textContent=game.players.length===1?`本次得分 ${total(rank[0].sheet)}`:`${winners.map(p=>p.name).join('、')}${winners.length>1?' 并列获胜':' 获胜'}`;$('ranking').innerHTML=rank.map(p=>`<div class="rank"><span>${esc(p.name)}</span><b>${total(p.sheet)} 分</b></div>`).join('');if(!$('results').open)$('results').showModal();}
$('closeResults').onclick=()=>$('results').close();$('again').onclick=()=>{$('results').close();openSetup();};
function updateSetup(){const mode=$('mode').value;$('difficultyLabel').hidden=mode!=='cpu';$('countLabel').hidden=mode!=='local';$('modelSetupNote').hidden=mode!=='model';const n=mode==='local'?+$('count').value:1;const old=[...$('names').querySelectorAll('input')].map(i=>i.value);$('names').innerHTML=Array.from({length:n},(_,i)=>`<label>玩家 ${i+1} 名称<input required maxlength="16" name="player${i}" value="${esc(old[i]|| (i===0?'你':`玩家 ${i+1}`))}"></label>`).join('');}
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
try{const data=JSON.parse(store.get('yacht-game'));if(data?.version===1&&Array.isArray(data.players)&&data.players.length>=1&&data.players.length<=4&&Number.isInteger(data.turn)&&data.turn>=0&&data.turn<data.players.length&&Array.isArray(data.dice)&&data.dice.length===5&&data.dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6)&&Array.isArray(data.held)&&data.held.length===5&&Number.isInteger(data.rolls)&&data.rolls>=0&&data.rolls<=3&&Array.isArray(data.log)&&data.players.every(p=>typeof p.name==='string'&&['human','cpu','model'].includes(p.type)&&p.sheet&&Object.entries(p.sheet).every(([k,v])=>categories.some(c=>c[0]===k)&&Number.isFinite(v)&&v>=0&&v<=50)))game=data;}catch{}
if(game){render();status('已恢复上次的航行','对局自动保存在此浏览器中。模型 Key 不会存档，需重新填写。');if(game.done)showResults();else scheduleBot();}
else{game=createGame([{name:'你',type:'human'},{name:'领航员',type:'cpu',level:'normal'}]);render();openSetup();}
