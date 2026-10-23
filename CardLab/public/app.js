import {HANDS,MODULES,TARGETS,rankText,suitText,createGame,preview,play,discard,buyModule,upgrade,sell,reroll,nextStage,validSave} from './engine.js';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('zh-CN'),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state,selected=[],quiet=document.documentElement.dataset.view==='quiet',sort='rank',storageWarning=false;
try{const data=JSON.parse(localStorage.getItem('cardlab-save'));if(validSave(data))state=data;}catch{}
state??=createGame();
const neutral=['单值','双值','双组','三值','连续','同类','三二组合','四值','同类连续'];
const name=h=>quiet?neutral[HANDS.findIndex(x=>x.id===h.id)]:h.name;
const moduleName=m=>quiet?`模块 ${String(MODULES.indexOf(m)+1).padStart(2,'0')}`:m.name;
const terminology=text=>quiet?text.replaceAll('只出','仅提交').replaceAll('每张','每项').replaceAll('出牌','提交').replaceAll('弃牌','替换').replaceAll('倍率','系数').replaceAll('筹码','基础值').replaceAll('对子','双值').replaceAll('顺子','连续组合').replaceAll('同花','同类组合').replaceAll('计分的','参与统计的').replaceAll('张牌','项数据').replaceAll('红桃或方块','H 类或 D 类').replaceAll('黑桃或梅花','S 类或 C 类'):text;
function save(){try{localStorage.setItem('cardlab-save',JSON.stringify(state));storageWarning=false;}catch{storageWarning=true;}}
function notify(text){$('notice').textContent=terminology(text);}
function execute(fn){try{const message=fn();selected=[];save();render();if(message)notify(message);}catch(e){notify(e.message);}}
function render(){
 document.documentElement.dataset.view=quiet?'quiet':'standard';document.title=quiet?'组合分析 · 本地工作台':'纸牌工坊 · HGame';
 const texts={brand:quiet?'本地工作台':'H▧GAME / 002',eyebrow:'THE ART OF A GOOD HAND',title:quiet?'组合收益分析':'纸牌工坊',subtitle:quiet?'样本选择、策略配置与分阶段指标验证。':'让一手好牌，变成一整套好策略。',runTag:quiet?'本地处理 / 8 阶段':'单人构筑 / 8 阶段',view:quiet?'标准视图':'简洁模式',help:quiet?'操作说明':'玩法说明',new:quiet?'新建记录':'新的一局',scoreLabel:quiet?'本阶段累计':'本关得分',targetLabel:quiet?'指标':'目标',moduleTitle:quiet?'策略配置':'效果模块',handTitle:quiet?'可用样本':'你的手牌',sortRank:quiet?'按数值':'按点数',sortSuit:quiet?'按类别':'按花色',play:quiet?'提交组合':'出牌',discard:quiet?'替换样本':'弃牌',clear:'取消选择',shopTitle:quiet?'配置更新':'关间商店',next:quiet?'进入下一阶段 →':'进入下一关 →',referenceTitle:quiet?'组合规则':'牌型手册',levelLabel:quiet?'基础值 × 系数':'筹码 × 倍率',journalTitle:quiet?'阶段记录':'通关记录',footer:quiet?'本地数据工作区':'HGame · 原创效果与界面 · 离线单人',restart:quiet?'新建记录':'再开一局',newTitle:quiet?'新建分析记录？':'开启新的一局？',newHint:'将覆盖当前自动存档。',cancelNew:'继续当前进度',confirmNew:'确认新建'};
 for(const [id,text]of Object.entries(texts))$(id).textContent=text;
 $('view').setAttribute('aria-pressed',String(quiet));
 $('stage').textContent=`${quiet?'阶段':'关卡'} ${String(state.stage+1).padStart(2,'0')} / 08`;
 $('phase').textContent=quiet?({play:'采样分析',shop:'配置阶段',won:'已完成',lost:'未达指标'})[state.phase]:({play:'挑战进行中',shop:'目标达成',won:'全部通关',lost:'挑战结束'})[state.phase];
 $('score').textContent=fmt(state.score);$('target').textContent=fmt(TARGETS[state.stage]);$('progress').value=Math.min(state.score,TARGETS[state.stage]);$('progress').max=TARGETS[state.stage];
 $('hands').textContent=`${quiet?'提交':'出牌'} ${state.hands} / 4`;$('discards').textContent=`${quiet?'替换':'弃牌'} ${state.discards} / 3`;$('deck').textContent=`${quiet?'待取样本':'牌堆'} ${state.deck.length}`;$('money').textContent=`$${state.money}`;
 $('slots').textContent=`${state.modules.length} / 5`;
 $('modules').innerHTML=state.modules.length?state.modules.map(id=>{const m=MODULES.find(m=>m.id===id);return `<article class="module"><span class="module-mark">${quiet?'M':'✦'}</span><div><b>${moduleName(m)}</b><p>${terminology(m.desc)}</p></div>${state.phase==='shop'?`<button data-sell="${id}">出售 $${Math.floor(m.price/2)}</button>`:''}</article>`;}).join(''):`<div class="empty">${quiet?'暂无策略模块。完成阶段后可配置。':'还没有效果模块。通过第一关，在商店构筑你的策略。'}</div>`;
 const hand=[...state.hand].sort((a,b)=>sort==='rank'?b.rank-a.rank||a.suit.localeCompare(b.suit):a.suit.localeCompare(b.suit)||b.rank-a.rank);
 $('cards').innerHTML=hand.map(c=>`<button class="card ${['H','D'].includes(c.suit)?'red':''} ${selected.includes(c.id)?'selected':''}" data-card="${c.id}" aria-pressed="${selected.includes(c.id)}" aria-label="${quiet?c.suit:suitText(c.suit)} ${rankText(c.rank)}" ${state.phase!=='play'?'disabled':''}><span class="card-corner">${quiet?c.suit:rankText(c.rank)}<small>${quiet?'':suitText(c.suit)}</small></span><span class="card-center">${quiet?rankText(c.rank):suitText(c.suit)}</span><span class="card-bottom">${quiet?'样本':rankText(c.rank)}</span></button>`).join('');
 $('selectedCount').textContent=quiet?`已选 ${selected.length}/5 项`:`已选 ${selected.length}/5 张`;
 const playing=state.phase==='play';$('playArea').hidden=!playing;$('shop').hidden=state.phase!=='shop';$('ending').hidden=!['won','lost'].includes(state.phase);
 $('play').disabled=!playing||!selected.length;$('discard').disabled=!playing||!selected.length||state.discards===0;$('clear').disabled=!selected.length;
 if(selected.length&&playing){const p=preview(state,state.hand.filter(c=>selected.includes(c.id)));$('preview').innerHTML=`<div><span class="preview-label">${quiet?'预计结果':'本手预览'}</span><b>${name(p.hand)} <small>Lv.${p.level}</small></b></div><div class="formula"><span>${fmt(p.chips)}</span> × <span>${p.mult}</span> = <strong>${fmt(p.points)}</strong></div><p>${p.steps.length?p.steps.map(s=>{const m=MODULES.find(m=>m.id===s.id);return `${moduleName(m)} ${s.factor?'×'+s.factor:s.chips?'+'+s.chips+(quiet?' 基础值':' 筹码'):'+'+s.mult+(quiet?' 系数':' 倍率')}`;}).join(' · '):(quiet?'当前无策略加成':'选择组合，效果模块会自动结算。')}</p>`;}
 else $('preview').innerHTML=`<div><span class="preview-label">${quiet?'组合分析':'本手预览'}</span><b>${quiet?'请选择 1–5 项样本':'请选择 1–5 张手牌'}</b></div><div class="formula muted">— × —</div><p>${quiet?'数值结果会在提交前显示。':'只有构成牌型的牌参与计分；高牌只计最高的一张。'}</p>`;
 $('reference').innerHTML=[...HANDS].reverse().map(h=>{const l=state.levels[h.id];return `<div class="reference-row"><b>${name(h)} <small>Lv.${l}</small></b><span>${h.base+(l-1)*h.up} × ${h.mult+l-1}</span></div>`;}).join('');
 $('scoringHint').textContent=quiet?'基础值 = 组合基础 + 参与项数值 + 模块加成。先累计加法，再结算乘法。': '筹码 = 牌型基础 + 计分牌点数 + 模块加成。A 计 11，J/Q/K 计 10；先加后乘，最终分数向下取整。';
 $('journal').innerHTML=state.history.length?state.history.map(h=>`<div class="journal-row"><span>${quiet?'阶段':'关卡'} ${h.stage} · ${fmt(h.score)} / ${fmt(h.target)}</span><b>+$${h.reward}</b></div>`).join(''):`<p class="empty">${quiet?'暂无完成记录':'第一段旅程，从这手牌开始。'}</p>`;
 if(state.phase==='shop')renderShop();
 $('endingTitle').textContent=state.phase==='won'?(quiet?'全部指标已完成':'八关通关，构筑完成！'):(quiet?'本阶段未达指标':'这一局，到这里休息一下');
 $('endingText').textContent=state.phase==='won'?`最终${quiet?'累计':'得分'} ${fmt(state.score)}，剩余资金 $${state.money}。`:`${quiet?'累计':'得分'} ${fmt(state.score)} / ${fmt(TARGETS[state.stage])}。${quiet?'可新建记录再次分析。':'试试更集中地升级一个牌型，或组合能互相配合的模块。'}`;
 $('last').textContent=state.last?`${quiet?'最近提交':'上一手'}：${quiet?'组合':state.last.name} · ${state.last.chips} × ${state.last.mult} = ${fmt(state.last.points)}${state.last.reward?` · 阶段收入 $${state.last.reward}`:''}`:'';
 $('notice').textContent=storageWarning?'浏览器存储不可用，本次进度无法自动保存。':'';
 renderHelp();document.documentElement.classList.add('ready');
}
function renderShop(){
 $('shopHint').textContent=quiet?'最多配置 5 个模块。提交次数将在下一阶段重置；未花资金每 $5 提供 $1 收益（上限 $5）。':'最多持有 5 个效果模块。每关重洗 52 张牌，恢复 4 次出牌与 3 次弃牌。保留资金可获得利息。';
 $('offers').innerHTML=state.shop.modules.map((o,i)=>{const m=MODULES.find(m=>m.id===o.id);return `<article class="offer"><div class="offer-icon">${quiet?'M'+String(MODULES.indexOf(m)+1).padStart(2,'0'):'✦'}</div><b>${moduleName(m)}</b><p>${terminology(m.desc)}</p><button data-buy="${i}" ${o.bought||state.money<m.price||state.modules.length>=5?'disabled':''}>${o.bought?'已配置':`购买 $${m.price}`}</button></article>`;}).join('');
 $('upgrades').innerHTML=state.shop.upgrades.map((o,i)=>{const h=HANDS.find(h=>h.id===o.id);return `<div class="upgrade"><div><b>${name(h)} · ${o.bought?`Lv.${state.levels[h.id]} 已升级`:`Lv.${state.levels[h.id]} → ${state.levels[h.id]+1}`}</b><small>+${h.up} ${quiet?'基础值':'筹码'} / +1 ${quiet?'系数':'倍率'}</small></div><button data-upgrade="${i}" ${o.bought||state.money<5?'disabled':''}>${o.bought?'已升级':'升级 $5'}</button></div>`;}).join('');
 $('reroll').disabled=state.money<3;
}
function renderHelp(){
 $('helpTitle').textContent=quiet?'分析流程说明':'把一手牌，做成一套策略';
 $('helpContent').innerHTML=quiet?'<p>共有 8 阶段，每阶段 4 次提交、3 次替换。点击选择 1–5 项，预览收益后提交；或使用替换机会更新所选样本。</p><p>单值只统计最高值，双值/三值/四值只统计对应重复项；双组统计两组重复项；其余组合统计全部五项。A=11，J/Q/K=10。</p><p>组合基础值与模块加成累加后乘以系数。模块乘法最后处理。达到指标即可配置模块，未达指标且次数耗尽则结束。</p><p>每阶段收入 = 5 + 剩余提交次数 + 资金收益（每 $5 提供 $1，最多 $5）。最多持有 5 个模块，配置阶段可出售。升级效果持续整次记录。</p><p>Alt+M 切换视图，自动保存本次记录。页面为本地分析视图，不会隐藏浏览器地址或历史。</p>':'<p>这是一款原创扑克构筑小游戏：用有限的出牌次数达到目标，关间购买效果模块，挑战全部 8 关。</p><p>每关抽 8 张牌，最多出牌 4 次、弃牌 3 次。选 1–5 张后可以出牌或弃掉补牌。出牌前会显示准确分数。每关开始重新洗一副 52 张牌，不含大小王；支持 A2345 顺子。</p><p>高牌只计最高一张；一对、两对、三条、四条只计构成牌型的牌；顺子、同花、葫芦、同花顺计全部五张。A 计 11，J/Q/K 计 10。只看所选牌，不自动从超出五张的牌中挑选。</p><p>得分 =（牌型筹码 + 计分牌点数 + 模块筹码）×（牌型倍率 + 模块倍率），再结算乘法模块，向下取整。升级牌型永久增加本局该牌型的筹码与倍率。</p><p>过关收入 = $5 + 剩余出牌次数 + 利息（当前资金每 $5 提供 $1，最多 $5）。商店最多持有 5 个模块，可以出售换位；刷新整组商品花费 $3。每一关单独累计分数。</p><p>Alt+M 切换简洁视图。进度自动保存在当前浏览器；新建一局会覆盖存档。全程离线，无需付费或 API Key。</p>';
}
$('cards').onclick=e=>{const card=e.target.closest('[data-card]');if(!card||state.phase!=='play')return;const id=card.dataset.card;if(selected.includes(id))selected=selected.filter(x=>x!==id);else if(selected.length<5)selected.push(id);else return notify(quiet?'最多选择 5 项':'最多选择 5 张牌');render();};
$('clear').onclick=()=>{selected=[];render();};$('sortRank').onclick=()=>{sort='rank';render();};$('sortSuit').onclick=()=>{sort='suit';render();};
$('play').onclick=()=>execute(()=>{const p=play(state,selected);return `${quiet?'已提交':'已出牌'}：${fmt(p.points)}`;});$('discard').onclick=()=>execute(()=>{discard(state,selected);return quiet?'样本已更新':'已弃牌并补充手牌';});
$('offers').onclick=e=>{const b=e.target.closest('[data-buy]');if(b&&!b.disabled)execute(()=>buyModule(state,+b.dataset.buy));};$('upgrades').onclick=e=>{const b=e.target.closest('[data-upgrade]');if(b&&!b.disabled)execute(()=>upgrade(state,+b.dataset.upgrade));};$('modules').onclick=e=>{const b=e.target.closest('[data-sell]');if(b)execute(()=>sell(state,b.dataset.sell));};
$('reroll').onclick=()=>execute(()=>reroll(state));$('next').onclick=()=>execute(()=>nextStage(state));
function toggle(){quiet=!quiet;try{localStorage.setItem('cardlab-view',quiet?'quiet':'standard');}catch{}render();}
$('view').onclick=toggle;document.addEventListener('keydown',e=>{if(e.altKey&&e.code==='KeyM'&&!e.repeat){e.preventDefault();toggle();}});
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
for(const id of ['new','restart'])$(id).onclick=()=>$('newDialog').showModal();$('cancelNew').onclick=()=>$('newDialog').close();$('confirmNew').onclick=()=>{$('newDialog').close();execute(()=>{state=createGame();return quiet?'新记录已创建':'新的一局开始了';});};
render();save();if(storageWarning)notify('浏览器存储不可用，本次进度无法自动保存。');
