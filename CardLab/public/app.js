import {HANDS,MODULES,TARGETS,DECKS,DIFFICULTIES,deckFor,difficultyFor,targetFor,stageRule,moduleDescription,rankText,suitText,createSeededGame,preview,play,discard,buyModule,upgrade,sell,reroll,rerollCost,nextStage,validSave} from './engine.js';
import {recordRun,validRecord} from './records.js';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('zh-CN'),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state,selected=[],quiet=document.documentElement.dataset.view==='quiet',sort='rank',storageWarning=false,records=[],pendingVersion=5,pendingPurchase=null;
try{const data=JSON.parse(localStorage.getItem('cardlab-save'));if(validSave(data))state=data;}catch{}
state??=createSeededGame();
state.runId??=crypto.randomUUID();
try{const data=JSON.parse(localStorage.getItem('cardlab-records'));if(Array.isArray(data))records=data.filter(validRecord).slice(0,50);}catch{}
const neutral=['单值','双值','双组','三值','连续','同类','三二组合','四值','同类连续'];
const name=h=>quiet?neutral[HANDS.findIndex(x=>x.id===h.id)]:h.name;
const moduleName=m=>quiet?`模块 ${String(MODULES.indexOf(m)+1).padStart(2,'0')}`:m.name;
const terminology=text=>quiet?text.replaceAll('只出','仅提交').replaceAll('每张','每项').replaceAll('出牌','提交').replaceAll('弃牌','替换').replaceAll('倍率','系数').replaceAll('筹码','基础值').replaceAll('对子','双值').replaceAll('同花顺','同类连续').replaceAll('顺子','连续组合').replaceAll('同花','同类组合').replaceAll('计分的','参与统计的').replaceAll('张牌','项数据').replaceAll('红桃或方块','H 类或 D 类').replaceAll('黑桃或梅花','S 类或 C 类'):text;
function save(){try{records=recordRun(records,state);localStorage.setItem('cardlab-save',JSON.stringify(state));localStorage.setItem('cardlab-records',JSON.stringify(records));storageWarning=false;}catch{storageWarning=true;}}
function notify(text){$('notice').textContent=terminology(text);}
function execute(fn){try{const message=fn();selected=[];save();render();if(message)notify(message);}catch(e){notify(e.message);}}
function render(){
 document.documentElement.dataset.view=quiet?'quiet':'standard';document.title=quiet?'组合分析 · 本地工作台':'纸牌工坊 · HGame';
 const texts={brand:quiet?'本地工作台':'H▧GAME / 002',eyebrow:'THE ART OF A GOOD HAND',title:quiet?'组合收益分析':'纸牌工坊',subtitle:quiet?'样本选择、策略配置与分阶段指标验证。':'让一手好牌，变成一整套好策略。',runTag:quiet?'本地处理 / 8 阶段':'单人构筑 / 8 阶段',view:quiet?'标准视图':'简洁模式',help:quiet?'操作说明':'玩法说明',new:quiet?'新建记录':'新的一局',scoreLabel:quiet?'本阶段累计':'本关得分',targetLabel:quiet?'指标':'目标',moduleTitle:quiet?'策略配置':'效果模块',handTitle:quiet?'可用样本':'你的手牌',sortRank:quiet?'按数值':'按点数',sortSuit:quiet?'按类别':'按花色',play:quiet?'提交组合':'出牌',discard:quiet?'替换样本':'弃牌',clear:'取消选择',shopTitle:quiet?'配置更新':'关间商店',next:quiet?'进入下一阶段 →':'进入下一关 →',referenceTitle:quiet?'组合规则':'牌型手册',levelLabel:quiet?'基础值 × 系数':'筹码 × 倍率',journalTitle:quiet?'阶段记录':'通关记录',footer:quiet?'本地数据工作区':'HGame · 原创效果与界面 · 离线单人',restart:quiet?'新建记录':'再开一局',newTitle:quiet?'新建分析记录？':'开启新的一局？',newHint:'将覆盖当前自动存档。',cancelNew:'继续当前进度',confirmNew:'确认新建'};
 for(const [id,text]of Object.entries(texts))$(id).textContent=text;
 $('view').setAttribute('aria-pressed',String(quiet));
 $('runTag').textContent=`${quiet?deckFor(state).quiet:deckFor(state).name} · ${difficultyFor(state).name}`;
 $('deckInputLabel').textContent=quiet?'样本配置':'起始牌组';$('difficultyInputLabel').textContent=quiet?'指标强度':'难度';
 for(const id of ['deckInput','recordDeck'])for(const option of $(id).options){option.textContent=option.value?(quiet?DECKS[option.value].quiet:DECKS[option.value].name)+(id==='deckInput'?` · ${DECKS[option.value].size}`:''):(quiet?'全部样本':'全部牌组');}
 $('recordDeck').setAttribute('aria-label',quiet?'按样本配置筛选':'按牌组筛选');
 $('seedLabel').textContent=(state.seed?`${quiet?'记录编号':'种子'} · ${state.seed} / v${state.version}`:(quiet?'旧版记录 · 无编号':'经典存档 · 无种子编号'))+` · ${quiet?deckFor(state).quiet:deckFor(state).name} / ${difficultyFor(state).name}`;
 $('replayCurrent').disabled=!state.seed;$('replayCurrent').textContent=quiet?'按编号重建':'同种子重开';
 $('recapButton').textContent=quiet?'过程明细':'构筑回顾';$('recapTitle').textContent=quiet?'过程明细':'构筑回顾';$('recapContent').innerHTML=recapHTML(state.recap,state.modules);
 $('recordsButton').textContent=quiet?'历史记录':'本地战绩';$('recordsTitle').textContent=quiet?'历史记录':'本地战绩';$('seedInputLabel').textContent=quiet?'记录编号（留空随机）':'种子编号（留空随机）';
 $('stage').textContent=`${quiet?'阶段':'关卡'} ${String(state.stage+1).padStart(2,'0')} / 08`;
 $('phase').textContent=quiet?({play:'采样分析',shop:'配置阶段',won:'已完成',lost:'未达指标'})[state.phase]:({play:'挑战进行中',shop:'目标达成',won:'全部通关',lost:'挑战结束'})[state.phase];
 $('score').textContent=fmt(state.score);$('target').textContent=fmt(targetFor(state));$('progress').value=Math.min(state.score,targetFor(state));$('progress').max=targetFor(state);
 $('hands').textContent=`${quiet?'提交':'出牌'} ${state.hands} / 4`;$('discards').textContent=`${quiet?'替换':'弃牌'} ${state.discards} / ${deckFor(state).discards}`;$('deck').textContent=`${quiet?'待取样本':'牌堆'} ${state.deck.length}`;$('money').textContent=`$${state.money}`;
 $('slots').textContent=`${state.modules.length} / 5`;
 $('modules').innerHTML=state.modules.length?state.modules.map(id=>{const m=MODULES.find(m=>m.id===id);return `<article class="module"><span class="module-mark">${quiet?'M':'✦'}</span><div><b>${moduleName(m)}</b><p>${terminology(moduleDescription(m,state))}</p></div>${state.phase==='shop'?`<button data-sell="${id}">出售 $${Math.floor(m.price/2)}</button>`:''}</article>`;}).join(''):`<div class="empty">${quiet?'暂无策略模块。完成阶段后可配置。':'还没有效果模块。通过第一关，在商店构筑你的策略。'}</div>`;
 const currentPreview=selected.length&&state.phase==='play'?preview(state,state.hand.filter(c=>selected.includes(c.id))):null;
 const scoringIds=currentPreview?.scoring.map(c=>c.id)||[];
 const hand=[...state.hand].sort((a,b)=>sort==='rank'?b.rank-a.rank||a.suit.localeCompare(b.suit):a.suit.localeCompare(b.suit)||b.rank-a.rank);
 $('cards').innerHTML=hand.map(c=>`<button class="card ${['H','D'].includes(c.suit)?'red':''} ${selected.includes(c.id)?'selected':''}" data-counted="${selected.includes(c.id)?scoringIds.includes(c.id):''}" data-card="${c.id}" aria-pressed="${selected.includes(c.id)}" aria-label="${quiet?c.suit:suitText(c.suit)} ${rankText(c.rank)}" ${state.phase!=='play'?'disabled':''}><span class="card-corner">${quiet?c.suit:rankText(c.rank)}<small>${quiet?'':suitText(c.suit)}</small></span><span class="card-center">${quiet?rankText(c.rank):suitText(c.suit)}</span><span class="card-bottom">${quiet?'样本':rankText(c.rank)}</span>${selected.includes(c.id)?`<span class="counted-label">${scoringIds.includes(c.id)?(quiet?'计入':'计分'):(quiet?'不计入':'不计分')}</span>`:''}</button>`).join('');
 $('selectedCount').textContent=quiet?`已选 ${selected.length}/5 项`:`已选 ${selected.length}/5 张`;
 const playing=state.phase==='play';$('playArea').hidden=!playing;$('shop').hidden=state.phase!=='shop';$('ending').hidden=!['won','lost'].includes(state.phase);
 $('play').disabled=!playing||!selected.length||Boolean(currentPreview?.blocked);$('discard').disabled=!playing||!selected.length||state.discards===0;$('clear').disabled=!selected.length;
 if(selected.length&&playing){const p=currentPreview;$('preview').innerHTML=`<div><span class="preview-label">${quiet?'预计结果':'本手预览'}</span><b>${name(p.hand)} <small>Lv.${p.level}</small></b></div><div class="formula"><span>${fmt(p.chips)}</span> × <span>${p.mult}</span> ${p.penalty!==1?` × ${p.penalty}`:''} = <strong>${fmt(p.points)}</strong></div><p>${p.steps.length?p.steps.map(s=>{const m=MODULES.find(m=>m.id===s.id);return `${moduleName(m)} ${s.factor?'×'+s.factor:s.chips?'+'+s.chips+(quiet?' 基础值':' 筹码'):'+'+s.mult+(quiet?' 系数':' 倍率')}`;}).join(' · '):(quiet?'当前无策略加成':'选择组合，效果模块会自动结算。')}</p>${scoreDetails(p)}`;}
 else $('preview').innerHTML=`<div><span class="preview-label">${quiet?'组合分析':'本手预览'}</span><b>${quiet?'请选择 1–5 项样本':'请选择 1–5 张手牌'}</b></div><div class="formula muted">— × —</div><p>${quiet?'数值结果会在提交前显示。':'只有构成牌型的牌参与计分；高牌只计最高的一张。'}</p>`;
 $('reference').innerHTML=[...HANDS].reverse().map(h=>{const l=state.levels[h.id];return `<div class="reference-row"><b>${name(h)} <small>Lv.${l}</small></b><span>${h.base+(l-1)*h.up} × ${h.mult+l-1}</span></div>`;}).join('');
 $('scoringHint').textContent=quiet?'基础值 = 组合基础 + 参与项数值 + 模块加成。先累计加法，再结算乘法。': '筹码 = 牌型基础 + 计分牌点数 + 模块加成。A 计 11，J/Q/K 计 10；先加后乘，最终分数向下取整。';
 $('journal').innerHTML=state.history.length?state.history.map(h=>`<div class="journal-row"><span>${quiet?'阶段':'关卡'} ${h.stage} · ${fmt(h.score)} / ${fmt(h.target)}</span><b>+$${h.reward}</b></div>`).join(''):`<p class="empty">${quiet?'暂无完成记录':'第一段旅程，从这手牌开始。'}</p>`;
 if(state.phase==='shop')renderShop();
 $('endingTitle').textContent=state.phase==='won'?(quiet?'全部指标已完成':'八关通关，构筑完成！'):(quiet?'本阶段未达指标':'这一局，到这里休息一下');
 $('endingText').textContent=state.phase==='won'?`最终${quiet?'累计':'得分'} ${fmt(state.score)}，剩余资金 $${state.money}。`:`${quiet?'累计':'得分'} ${fmt(state.score)} / ${fmt(targetFor(state))}。${quiet?'可新建记录再次分析。':'试试更集中地升级一个牌型，或组合能互相配合的模块。'}`;
 $('last').textContent=state.last?`${quiet?'最近提交':'上一手'}：${quiet?'组合':state.last.name} · ${state.last.chips} × ${state.last.mult}${state.last.penalty&&state.last.penalty!==1?` × ${state.last.penalty}`:''} = ${fmt(state.last.points)}${state.last.reward?` · 阶段收入 $${state.last.reward}`:''}`:'';
 $('notice').textContent=storageWarning?'浏览器存储不可用，本次进度无法自动保存。':'';
 renderStageRule();
 if(currentPreview?.blocked)$('preview').insertAdjacentHTML('beforeend',`<p class="blocked">${quiet?'本阶段首次提交需选择 5 项。':'本关第一次出牌必须选择 5 张牌。'}</p>`);
 if(state.last?.handChips!==undefined)$('last').insertAdjacentHTML('beforeend',scoreDetails(state.last));
 renderConfiguration();renderRecords();renderHelp();if($('replaceDialog').open&&pendingPurchase!==null)openReplacement(pendingPurchase);document.documentElement.classList.add('ready');
}
function renderConfiguration(){
 const p=DECKS[$('deckInput').value],d=DIFFICULTIES[$('difficultyInput').value];
 const desc=quiet?`共 ${p.size} 项样本，每阶段 ${p.discards} 次替换。${p===DECKS.trimmed?'不含 2、3。':p===DECKS.numeric?'不含 J/Q/K，配置更新不提供模块 07。':'包含所有类别与数值。'}`:p.desc;
 $('configurationHint').textContent=`${pendingVersion===3?'按历史 v3 规则复现，配置已锁定。 ':''}${pendingVersion>=5?'v5：整次记录首次刷新免费，之后每次 $3。 ':'历史规则：每次刷新 $3。 '}${desc} ${quiet?'阶段指标':'八关目标'}：${TARGETS.map(t=>Math.round(t*d.scale)).join(' / ')}。`;
}
function scoreDetails(p){
 const rows=[[quiet?'组合基础值':'牌型筹码',p.handChips],[quiet?'计入样本数值':'计分牌点数',p.cardChips],[quiet?'初始系数':'基础倍率',p.baseMult]];
 for(const step of p.steps||[]){const m=MODULES.find(m=>m.id===step.id);if(m)rows.push([moduleName(m),step.factor?`倍率 ×${step.factor}`:`筹码 +${step.chips} / 倍率 +${step.mult}`]);}
 if(p.penalty!==1)rows.push(['阶段调整',`最终结果 ×${p.penalty}`]);
 const scoring=p.scoring||p.cards||[];
 return `<details class="breakdown"><summary>${quiet?'计算明细':'结算明细'}</summary>${scoring.length?`<p>${quiet?'计入项':'计分牌'}：${esc(scoring.map(c=>`${quiet?c.suit:suitText(c.suit)}${rankText(c.rank)}`).join(' · '))}</p>`:''}${rows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(terminology(String(v)))}</b></div>`).join('')}${p.blocked?'<p class="blocked">首次提交需选择 5 项；当前组合不能提交。</p>':''}<div><span>最终结果（向下取整）</span><b>${fmt(p.points)}</b></div></details>`;
}
function renderStageRule(){
 const next=state.phase==='shop',s=next?{...state,stage:state.stage+1}:state,r=stageRule(s);
 const quietDesc={redZero:'H/D 类计入项的数值归零；仍参与分类并触发策略模块。',fullOpening:'本阶段首次提交必须选满 5 项，之后不限制。替换不受影响。',variety:'本阶段重复使用的组合类型，最终结果乘 0.5，向下取整。'};
 $('stageRule').innerHTML=`<b>${next?'下一阶段':'当前阶段'} · ${r?(quiet?`约束 ${r.id==='redZero'?'01':r.id==='fullOpening'?'02':'03'}`:r.name):(state.version===1?'经典规则':'常规规则')}</b><p>${r?esc(quiet?quietDesc[r.id]:r.desc):(state.version===1?'此存档沿用旧版规则，新建记录后启用特殊阶段。':'第 3 阶段：红色点数归零；第 6 阶段：首次选满五项；第 8 阶段：重复组合收益减半。')}</p>`;
}
function renderShop(){
 $('shopHint').textContent=quiet?`最多配置 5 个模块。下阶段重新生成 ${deckFor(state).size} 项样本，恢复 4 次提交、${deckFor(state).discards} 次替换。未花资金每 $5 提供 $1 收益（上限 $5）。`:`最多持有 5 个效果模块。下关重洗 ${deckFor(state).size} 张牌，恢复 4 次出牌与 ${deckFor(state).discards} 次弃牌。保留资金可获得利息。`;
 $('offers').innerHTML=state.shop.modules.map((o,i)=>{const m=MODULES.find(m=>m.id===o.id);return `<article class="offer"><div class="offer-icon">${quiet?'M'+String(MODULES.indexOf(m)+1).padStart(2,'0'):'✦'}</div><b>${moduleName(m)}</b><p>${terminology(moduleDescription(m,state))}</p><button data-buy="${i}" ${o.bought||(state.modules.length>=5?state.modules.every(id=>state.money+Math.floor(MODULES.find(m=>m.id===id).price/2)<m.price):state.money<m.price)?'disabled':''}>${o.bought?'已配置':state.modules.length>=5?`替换配置 · $${m.price}`:`购买 $${m.price}`}</button></article>`;}).join('');
 $('upgrades').innerHTML=state.shop.upgrades.map((o,i)=>{const h=HANDS.find(h=>h.id===o.id);return `<div class="upgrade"><div><b>${name(h)} · ${o.bought?`Lv.${state.levels[h.id]} 已升级`:`Lv.${state.levels[h.id]} → ${state.levels[h.id]+1}`}</b><small>+${h.up} ${quiet?'基础值':'筹码'} / +1 ${quiet?'系数':'倍率'}</small></div><button data-upgrade="${i}" ${o.bought||state.money<5?'disabled':''}>${o.bought?'已升级':'升级 $5'}</button></div>`;}).join('');
 const cost=rerollCost(state);$('reroll').disabled=state.money<cost;$('reroll').textContent=cost===0?'首次刷新 · 免费':`刷新 $${cost}`;
}
function renderHelp(){
 $('helpTitle').textContent=quiet?'分析流程说明':'把一手牌，做成一套策略';
 $('helpContent').innerHTML=quiet?'<p>共有 8 阶段，每阶段 4 次提交、3 次替换。点击选择 1–5 项，预览收益后提交；或使用替换机会更新所选样本。</p><p>单值只统计最高值，双值/三值/四值只统计对应重复项；双组统计两组重复项；其余组合统计全部五项。A=11，J/Q/K=10。</p><p>组合基础值与模块加成累加后乘以系数。模块乘法最后处理。达到指标即可配置模块，未达指标且次数耗尽则结束。</p><p>每阶段收入 = 5 + 剩余提交次数 + 资金收益（每 $5 提供 $1，最多 $5）。最多持有 5 个模块，配置阶段可出售。升级效果持续整次记录。</p><p>Alt+M 切换视图，自动保存本次记录。页面为本地分析视图，不会隐藏浏览器地址或历史。</p>':'<p>这是一款原创扑克构筑小游戏：用有限的出牌次数达到目标，关间购买效果模块，挑战全部 8 关。</p><p>每关抽 8 张牌，最多出牌 4 次、弃牌 3 次。选 1–5 张后可以出牌或弃掉补牌。出牌前会显示准确分数。每关开始重新洗一副 52 张牌，不含大小王；支持 A2345 顺子。</p><p>高牌只计最高一张；一对、两对、三条、四条只计构成牌型的牌；顺子、同花、葫芦、同花顺计全部五张。A 计 11，J/Q/K 计 10。只看所选牌，不自动从超出五张的牌中挑选。</p><p>得分 =（牌型筹码 + 计分牌点数 + 模块筹码）×（牌型倍率 + 模块倍率），再结算乘法模块，向下取整。升级牌型永久增加本局该牌型的筹码与倍率。</p><p>过关收入 = $5 + 剩余出牌次数 + 利息（当前资金每 $5 提供 $1，最多 $5）。商店最多持有 5 个模块，可以出售换位；刷新整组商品花费 $3。每一关单独累计分数。</p><p>Alt+M 切换简洁视图。进度自动保存在当前浏览器；新建一局会覆盖存档。全程离线，无需付费或 API Key。</p>';
 $('helpContent').innerHTML=$('helpContent').innerHTML.replace('每阶段 4 次提交、3 次替换',`每阶段 4 次提交、${deckFor(state).discards} 次替换`).replace('最多出牌 4 次、弃牌 3 次',`最多出牌 4 次、弃牌 ${deckFor(state).discards} 次`).replace('每关开始重新洗一副 52 张牌',`每关开始重新洗一副 ${deckFor(state).size} 张牌`).replace('支持 A2345 顺子',deckFor(state)===DECKS.trimmed?'本牌组不含 2、3，无法组成 A2345 顺子':'支持 A2345 顺子');
 $('helpContent').insertAdjacentHTML('beforeend',`<p>${state.version>=5?'v5 整局首次刷新免费，使用后每次 $3；免费次数跨阶段保存。':'此历史版本每次刷新 $3。'}模块满 5 个时，可以选择替换购买；旧模块按卖价抵扣，确认后一次完成交易，取消不会扣款。</p>`);
 $('helpContent').insertAdjacentHTML('beforeend',`<p>当前配置：${quiet?deckFor(state).quiet:deckFor(state).name}，${difficultyFor(state).name}。${quiet?'阶段指标':'过关目标'}为基础目标的 ${Math.round(difficultyFor(state).scale*100)}%。精简配置不含 2/3；数值配置不含 J/Q/K，每阶段只可替换 2 次，也不会提供模块 07。历史记录可以按配置筛选，再次挑战会恢复原有配置。</p>`);
 $('helpContent').insertAdjacentHTML('beforeend','<p>新版第 3 阶段：H/D 类计入项的点数归零，模块仍触发；第 6 阶段：首次提交需选满 5 项；第 8 阶段：重复组合的最终结果乘 0.5。配置阶段会预告下一阶段规则。旧版存档保持经典规则直到结束。预览和上一手均可展开计算明细。</p>');
 $('helpContent').insertAdjacentHTML('beforeend',`<p>${quiet?'记录编号':'种子编号'}决定每阶段的牌序及配置商品；相同版本、编号和操作可复现整局，刷新继续也不会改变后续商品。不同操作仍会影响所见结果。结束后保存最近 50 条${quiet?'记录':'战绩'}；同编号重建是新的一次尝试。</p>`);
}
function recapHTML(recap,modules=[]){
 const moduleText=id=>{const m=MODULES.find(m=>m.id===id);return m?moduleName(m):'未知模块';};
 const handText=id=>{const h=HANDS.find(h=>h.id===id);return h?name(h):'未知组合';};
 const moduleList=modules.length?modules.map(moduleText).join(' · '):'无';
 if(!recap)return `<p class="empty">此记录没有过程明细。旧进度继续操作后开始记录。</p><p class="recap-modules">${quiet?'当前／最终配置':'当前／最终模块'}：${esc(moduleList)}</p>`;
 const plays=recap.stages.flatMap(s=>s.plays),best=plays.reduce((best,p)=>!best||p.points>best.points?p:best,null),counts=new Map();
 for(const p of plays)counts.set(p.handId,(counts.get(p.handId)||0)+1);
 const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,n])=>`${handText(id)} ×${n}`).join(' · ');
 const transactions=recap.stages.flatMap(s=>s.transactions),cost=transactions.reduce((n,t)=>n+t.cost,0),refund=transactions.reduce((n,t)=>n+t.refund,0),omitted=recap.stages.reduce((n,s)=>n+s.omitted,0);
 return `<div class="recap-summary"><b>${recap.partial?'部分记录 · 从更新后操作开始':'从本局开局开始记录'}</b><p>已记录 ${plays.length} 次${quiet?'提交':'出牌'} · ${recap.stages.reduce((n,s)=>n+s.discards,0)} 次${quiet?'替换样本':'弃牌'}${omitted?' · 交易明细已截断':''}</p><p>最高单次 ${best?`${fmt(best.points)} · ${esc(handText(best.handId))}`:'—'}</p><p>${quiet?'常用组合':'常用牌型'}：${esc(top||'—')}</p><p>已记录支出 $${cost} · 卖出抵扣 $${refund}</p><p>${quiet?'当前／最终配置':'当前／最终模块'}：${esc(moduleList)}</p></div>${recap.stages.length?recap.stages.map(row=>`<section class="recap-stage"><h3>${quiet?'阶段':'关卡'} ${row.stage} · ${fmt(row.score)} / ${row.target?fmt(row.target):'—'}</h3><p>${row.plays.length} 次${quiet?'提交':'出牌'} · ${row.discards} 次${quiet?'替换':'弃牌'}</p>${row.plays.length?row.plays.map((p,i)=>`<div class="recap-play"><b>${i+1}. ${esc(handText(p.handId))} · ${fmt(p.points)}</b><span>${quiet?'计入项':'计分牌'}：${esc(p.cards.map(id=>`${quiet?id[0]:suitText(id[0])}${rankText(Number(id.slice(1)))}`).join(' · '))}</span></div>`).join(''):'<p class="empty">本阶段暂无已记录的提交。</p>'}${row.transactions.length?`<ul class="recap-transactions">${row.transactions.map(t=>{const label=t.type==='buy'?`购入 ${moduleText(t.moduleId)}`:t.type==='replace'?`${moduleText(t.replacedId)} → ${moduleText(t.moduleId)}`:t.type==='sell'?`出售 ${moduleText(t.moduleId)}`:t.type==='upgrade'?`升级 ${handText(t.handId)}`:'刷新商品';return `<li>${esc(label)} · ${t.refund?`抵扣 $${t.refund} / `:''}支出 $${t.cost} · 余额 $${t.balance}</li>`;}).join('')}</ul>`:''}${row.omitted?`<p class="empty">另有 ${row.omitted} 条交易未保留；每阶段最多保存 50 条。</p>`:''}</section>`).join(''):'<p class="empty">还没有操作记录，出牌或交易后即可回看。</p>'}`;
}
function renderRecords(){
 const filtered=records.filter(r=>(!$('recordDeck').value||(r.deckProfile||'standard')===$('recordDeck').value)&&(!$('recordDifficulty').value||(r.difficulty||'normal')===$('recordDifficulty').value));
 const wins=filtered.filter(r=>r.outcome==='won').length;
 $('recordSummary').textContent=`符合筛选 ${filtered.length} 条 · 完成全部阶段 ${wins} 次 · 累计最高 ${fmt(Math.max(0,...filtered.map(r=>r.total)))}`;
 $('recordList').innerHTML=filtered.length?filtered.map(r=>{const deck=DECKS[r.deckProfile||'standard'],diff=DIFFICULTIES[r.difficulty||'normal'];return `<article class="run-record"><div><b>${r.outcome==='won'?'已完成':'未达指标'} · ${r.stage}/8</b><span>${new Date(r.finishedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}</span></div><p>${quiet?deck.quiet:deck.name} · ${diff.name} · ${r.seed?esc(r.seed):'经典存档'} / v${r.version}</p><p>累计 ${fmt(r.total)} · 单次最高 ${(r.bestHand===null?'—':fmt(r.bestHand))}</p><details class="record-recap" data-record-recap="${esc(r.id)}"><summary>${quiet?'过程明细':'构筑回顾'}</summary><div class="record-recap-body"></div></details><button data-replay="${esc(r.id)}" ${![3,4,5].includes(r.version)||!r.seed?'disabled':''}>${quiet?'按编号重建':'同种子再挑战'}</button></article>`;}).join(''):'<p class="empty">暂无符合筛选的完成记录。当前进度仍会自动保存。</p>';
}
$('cards').onclick=e=>{const card=e.target.closest('[data-card]');if(!card||state.phase!=='play')return;const id=card.dataset.card;if(selected.includes(id))selected=selected.filter(x=>x!==id);else if(selected.length<5)selected.push(id);else return notify(quiet?'最多选择 5 项':'最多选择 5 张牌');render();};
$('clear').onclick=()=>{selected=[];render();};$('sortRank').onclick=()=>{sort='rank';render();};$('sortSuit').onclick=()=>{sort='suit';render();};
$('play').onclick=()=>execute(()=>{const p=play(state,selected);return `${quiet?'已提交':'已出牌'}：${fmt(p.points)}`;});$('discard').onclick=()=>execute(()=>{discard(state,selected);return quiet?'样本已更新':'已弃牌并补充手牌';});
$('offers').onclick=e=>{const b=e.target.closest('[data-buy]');if(b&&!b.disabled){if(state.modules.length>=5)openReplacement(+b.dataset.buy);else execute(()=>buyModule(state,+b.dataset.buy));}};$('upgrades').onclick=e=>{const b=e.target.closest('[data-upgrade]');if(b&&!b.disabled)execute(()=>upgrade(state,+b.dataset.upgrade));};$('modules').onclick=e=>{const b=e.target.closest('[data-sell]');if(b)execute(()=>sell(state,b.dataset.sell));};
function openReplacement(index){
 pendingPurchase=index;const m=MODULES.find(m=>m.id===state.shop.modules[index].id);
 $('replaceTitle').textContent=quiet?'替换策略配置':'替换效果模块';
 $('replaceHint').textContent=`${moduleName(m)} · $${m.price} · ${terminology(moduleDescription(m,state))} 按原卖价抵扣；点击下方模块确认替换。`;
 $('replacementChoices').innerHTML=state.modules.map(id=>{const old=MODULES.find(m=>m.id===id),refund=Math.floor(old.price/2),balance=state.money+refund-m.price;return `<button data-replace="${id}" ${balance<0?'disabled':''}><b>${moduleName(old)} · 抵扣 $${refund}</b><span>${terminology(moduleDescription(old,state))}</span><small>补差 $${m.price-refund} · 当前 $${state.money} → 余额 $${balance}</small></button>`;}).join('');
 $('replaceError').textContent='';if(!$('replaceDialog').open)$('replaceDialog').showModal();
}
$('replacementChoices').onclick=e=>{const b=e.target.closest('[data-replace]');if(!b||b.disabled||pendingPurchase===null)return;try{buyModule(state,pendingPurchase,b.dataset.replace);$('replaceDialog').close();pendingPurchase=null;selected=[];save();render();notify('模块已替换');}catch(e){$('replaceError').textContent=e.message;}};
$('cancelReplace').onclick=()=>{$('replaceDialog').close();pendingPurchase=null;};
$('reroll').onclick=()=>execute(()=>reroll(state));$('next').onclick=()=>execute(()=>nextStage(state));
function toggle(){quiet=!quiet;try{localStorage.setItem('cardlab-view',quiet?'quiet':'standard');}catch{}render();}
$('view').onclick=toggle;document.addEventListener('keydown',e=>{if(e.altKey&&e.code==='KeyM'&&!e.repeat){e.preventDefault();toggle();}});
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
function openNew(seed='',source=null){pendingVersion=[3,4,5].includes(source?.version)?source.version:5;$('seedInput').value=seed;$('seedError').textContent='';$('deckInput').value=source?.deckProfile||'standard';$('difficultyInput').value=source?.difficulty||'normal';$('deckInput').disabled=$('difficultyInput').disabled=pendingVersion===3;renderConfiguration();$('newDialog').showModal();}
for(const id of ['new','restart'])$(id).onclick=()=>openNew();$('replayCurrent').onclick=()=>openNew(state.seed,state);
$('deckInput').onchange=$('difficultyInput').onchange=renderConfiguration;
$('cancelNew').onclick=()=>$('newDialog').close();$('confirmNew').onclick=()=>{try{const input=$('seedInput').value.trim(),fresh=createSeededGame(input||undefined,{version:pendingVersion,deckProfile:$('deckInput').value,difficulty:$('difficultyInput').value});$('newDialog').close();execute(()=>{state=fresh;return quiet?'新记录已创建':'新的一局开始了';});}catch(e){$('seedError').textContent=e.message;}};
$('recapButton').onclick=()=>{$('recapContent').innerHTML=recapHTML(state.recap,state.modules);$('recapDialog').showModal();};$('closeRecap').onclick=()=>$('recapDialog').close();
$('recordsButton').onclick=()=>{renderRecords();$('recordsDialog').showModal();};$('closeRecords').onclick=()=>$('recordsDialog').close();
$('recordDeck').onchange=$('recordDifficulty').onchange=renderRecords;
$('recordList').addEventListener('toggle',e=>{const detail=e.target;if(!detail.matches('[data-record-recap]')||!detail.open)return;const record=records.find(r=>r.id===detail.dataset.recordRecap);if(record)detail.querySelector('.record-recap-body').innerHTML=recapHTML(record.recap,record.modules);},true);
$('recordList').onclick=e=>{const b=e.target.closest('[data-replay]');if(!b||b.disabled)return;const r=records.find(r=>r.id===b.dataset.replay);if(r&&[3,4,5].includes(r.version)&&r.seed){$('recordsDialog').close();openNew(r.seed,r);}};
save();render();if(storageWarning)notify('浏览器存储不可用，本次进度无法自动保存。');
