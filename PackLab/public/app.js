import {COLS,ROWS,MAX_ITEMS,MAX_HP,ITEMS,ENEMIES,BUILDS,enemyTrait,combatPreview,itemLevel,resaleValue,forgePreview,forge,shape,cellsFor,occupants,effects,neighbours,createGame,place,stash,rotate,autoPlace,previewPlacement,createLayoutHistory,clearLayoutHistory,editLayout,undoLayout,redoLayout,intent,startBattle,activate,endTurn,takeReward,skipReward,buy,sell,rest,validSave} from './engine.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state,selected=null,quiet=document.documentElement.dataset.view==='quiet',moving=false,anchor=null,storageWarning=false;
try{const saved=JSON.parse(localStorage.getItem('packlab-save'));if(validSave(saved))state=saved;}catch{}
state??=createGame();
const layoutHistory=createLayoutHistory(state);
const name=type=>quiet?ITEMS[type].quiet:ITEMS[type].name;
const rankedName=i=>name(i.type)+(itemLevel(i)?` ${quiet?'r':'+'}${itemLevel(i)}`:'');
const description=(type,instance=null)=>{let text=quiet?ITEMS[type].qdesc:ITEMS[type].desc;if(instance&&itemLevel(instance)>0){const def=ITEMS[type],base=def.kind==='weapon'?def.damage:def.block;if(base!==undefined)text=text.replace(String(base),String(base+itemLevel(instance)*3));}return text;};
const mark=type=>quiet?ITEMS[type].code:({blade:'⚔',shield:'⬡',spear:'↟',hammer:'⚒',bow:'⌁',armor:'▥',stone:'◆',herb:'✚',flask:'♧',dagger:'†',pouch:'¤',spark:'⌞',quiver:'⋮',crossbow:'↗',tower:'▣',bash:'⊞',bomb:'✷',kit:'✚'})[type];
const kind=type=>quiet?({weapon:'指令模块',guard:'防护模块',passive:'常驻模块',consume:'一次性补丁'})[ITEMS[type].kind]:({weapon:'武器',guard:'护具',passive:'被动物品',consume:'消耗品'})[ITEMS[type].kind];
function notify(text){$('notice').textContent=quiet?text.replaceAll('物品','模块').replaceAll('战斗','运行').replaceAll('回合','时间片').replaceAll('体力','执行预算').replaceAll('金币','资源点').replaceAll('生命','运行完整度').replaceAll('仓库','模块仓库').replaceAll('武器','指令模块').replaceAll('整备阶段','布局阶段').replaceAll('锻造','增量编译').replaceAll('强化','编译优化'):text;}
function save(){try{localStorage.setItem('packlab-save',JSON.stringify(state));storageWarning=false;}catch{storageWarning=true;}}
function execute(fn,layoutOnly=false){try{const result=fn();if(typeof result==='string'&&state.items.some(i=>i.uid===result))selected=result;if(!state.items.some(i=>i.uid===selected))selected=null;moving=false;anchor=null;if(!layoutOnly)clearLayoutHistory(state,layoutHistory);save();render();}catch(e){notify(e.message);}}
function render(){
 document.documentElement.dataset.view=quiet?'quiet':'standard';document.documentElement.dataset.phase=state.phase;document.title=quiet?'运行时调试台 · 本地沙箱':'行囊工坊 · PackLab';
 $('brand').textContent=quiet?'runtime.local / sandbox':'H▧GAME / 003';
 const texts={view:quiet?'探索视图':'调试台模式',eyebrow:quiet?'RUNTIME / LOCAL SANDBOX':'SMALL SPACE. BIG POSSIBILITIES.',title:quiet?'运行时调试台':'行囊工坊',subtitle:quiet?'布局模块，优化邻接，控制每个时间片。':'把每一格，变成战力。',hpLabel:quiet?'运行完整度':'生命',goldLabel:quiet?'资源点':'金币',energyLabel:quiet?'执行预算':'体力',blockLabel:quiet?'临时防护':'护甲',bagKicker:quiet?'MEMORY MAP':'YOUR BUILD',bagTitle:quiet?'内存布局':'背包布局',detailTitle:quiet?'模块检查器':'物品详情',stashTitle:quiet?'未加载模块':'行囊外仓库',stashHint:quiet?'未加载模块不参与执行与邻接优化。选择模块和目标地址，预览后提交映射；也可自动分配。':'仓库物品不生效。选择物品和落点，预览后确认放置；也可自动寻找空位。',activate:quiet?'执行模块':'使用物品',rotate:quiet?'旋转布局 90°':'旋转 90°',stash:quiet?'卸载至仓库':'移回仓库',placeSelected:quiet?'自动分配地址':'自动寻找空位',sell:quiet?'回收模块':'出售',endTurn:quiet?'结束时间片 →':'结束回合 →',rewardTitle:quiet?'依赖选择 · 三选一':'战利品 · 三选一',shopTitle:quiet?'模块源':'路边商店',logTitle:quiet?'执行日志':'行动记录',footer:quiet?'PackLab · 本地沙箱 · 无外部依赖':'PackLab · 离线单人 · 原创规则与界面',restart:quiet?'重启沙箱':'重新开始',new:quiet?'新建沙箱':'新的一局',newTitle:quiet?'新建沙箱？':'开启新的一局？',newHint:'确认后覆盖当前自动存档。',seedLabel:quiet?'运行种子（留空随机）':'种子编号（留空随机）'};
 for(const [id,text]of Object.entries(texts))$(id).textContent=text;
 $('view').setAttribute('aria-pressed',String(quiet));$('seed').textContent=`${quiet?'SEED':'种子'} ${state.seed} / v${state.version}`;$('buildName').textContent=quiet?BUILDS[state.build||'balanced'].quiet:BUILDS[state.build||'balanced'].name;$('floor').textContent=`${quiet?'DEPTH':'层数'} ${String(state.floor+1).padStart(2,'0')} / 08`;
 $('hp').textContent=`${state.hp} / ${MAX_HP}`;$('hpBar').value=state.hp;$('gold').textContent=state.gold;$('energy').textContent=state.phase==='battle'?String(state.energy):'—';$('block').textContent=state.phase==='battle'?state.block:'—';
 const editable=['prepare','camp'].includes(state.phase),current=state.items.find(i=>i.uid===selected),map=occupants(state);
 $('capacity').textContent=`${map.size} / 20 ${quiet?'地址':'格'}`;$('grid').setAttribute('aria-label',quiet?'内存布局':'背包布局');
 $('bagHint').textContent=state.phase==='battle'?(quiet?'运行期间地址锁定。选择模块，在检查器执行；每个模块每时间片限一次。':'战斗中布局锁定。选择物品，在详情中使用；每件物品每回合限用一次。'):moving?(quiet?'悬停、聚焦或点击目标地址预览，确认后提交映射。':'悬停、聚焦或点击目标格预览，再确认放置。'):(quiet?'点击模块检查；选中后再次点击可进入重映射。使用旋转按钮改变模块朝向。':'点击物品查看；再点一次同件物品进入摆放预览。使用旋转按钮调整朝向。');
 const adjacent=current&&current.x!==null?new Set(neighbours(state,current).map(i=>i.uid)):new Set();
 $('grid').innerHTML=Array.from({length:COLS*ROWS},(_,n)=>{const x=n%COLS,y=Math.floor(n/COLS),uid=map.get(`${x},${y}`),i=state.items.find(i=>i.uid===uid),first=i?cellsFor(i).sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0]:null;return `<button class="cell ${i?'filled '+ITEMS[i.type].kind:''} ${uid&&uid===selected?'selected':''} ${adjacent.has(uid)?'adjacent':''} ${i&&state.used.includes(uid)?'used':''}" data-x="${x}" data-y="${y}" ${uid?`data-uid="${uid}"`:''} aria-label="${quiet?'地址':'格'} ${quiet?'0x'+n.toString(16).padStart(2,'0'):`${x+1},${y+1}`} ${i?esc(rankedName(i)):quiet?'可分配':'空位'}" aria-pressed="${Boolean(uid&&uid===selected)}"><span class="address">${quiet?'0x'+n.toString(16).padStart(2,'0'):`${String.fromCharCode(65+x)}${y+1}`}</span>${i&&first[0]===x&&first[1]===y?`<b>${mark(i.type)}</b><small>${quiet?kind(i.type):esc(name(i.type))}</small>${itemLevel(i)?`<em class="level-tag">${quiet?'r':'+'}${itemLevel(i)}</em>`:''}`:i?'<span class="continuation">·</span>':'<span class="empty-cell">+</span>'}</button>`;}).join('');
 $('gridNote').textContent=quiet?'边邻接 = 地址单元共享一条边；角接触不计。':'边相邻触发加成；斜角接触不生效。';
 $('stashCount').textContent=`${state.items.filter(i=>i.x===null).length} ${quiet?'未加载':'件待装'} · ${state.items.length}/${MAX_ITEMS}`;
 $('inventory').innerHTML=state.items.filter(i=>i.x===null).map(i=>`<button data-select="${i.uid}" class="inventory-item ${selected===i.uid?'selected':''}"><b>${mark(i.type)}</b><span>${esc(rankedName(i))}</span><small>${shape(i.type,i.rotation).length} ${quiet?'地址':'格'}</small></button>`).join('')||`<p class="empty">${quiet?'所有模块均已加载。':'仓库空空的，新物品会放在这里。'}</p>`;
 renderDetail(current,editable);renderPlacement();renderHistory();renderEncounter();renderCamp();renderLog();renderHelp();renderBuildForm();
 $('notice').textContent=storageWarning?'浏览器存储不可用，当前进度无法自动保存。':'';
}
function renderDetail(i,editable){
 const def=i&&ITEMS[i.type],e=i&&effects(state,i);$('itemKind').textContent=i?kind(i.type):'—';
 $('detail').innerHTML=i?`<div class="item-name"><span>${mark(i.type)}</span><h3>${esc(rankedName(i))}</h3></div><p>${esc(description(i.type,i))}</p><p class="detail-state">${i.x===null?(quiet?'未加载 · 当前不生效':'在仓库中 · 当前不生效'):quiet?`已映射 · 地址 0x${(i.y*COLS+i.x).toString(16).padStart(2,'0')}`:`已装备 · 锚点 ${String.fromCharCode(65+i.x)}${i.y+1}`}</p>${i.x!==null?`<div class="effect-line">${e.damage?`<b>${quiet?'输出':'伤害'} ${e.damage}</b>`:''}${e.block?`<b>${quiet?'防护':'护甲'} ${e.block}</b>`:''}${e.heal?`<b>${quiet?'修复':'治疗'} ${e.heal}</b>`:''}${e.energy?`<b>${quiet?'预算':'体力'} +${e.energy}</b>`:''}${def.cost!==undefined?`<span>${quiet?'预算成本':'体力消耗'} ${def.cost}</span>`:''}</div>`:''}${i.x!==null?`<p class="detail-state">${quiet?'邻接模块':'相邻物品'}：${esc(neighbours(state,i).map(o=>name(o.type)).join(' · ')||'—')}</p>`:''}<div class="shape-preview">${shape(i.type,i.rotation).map(([x,y])=>`<span style="grid-column:${x+1};grid-row:${y+1}"></span>`).join('')}</div>`:`<p class="empty">${quiet?'点击内存地址或未加载模块，检查布局与输出。':'点击背包或仓库中的物品，查看效果与形状。'}</p>`;
 if(i&&i.x!==null&&state.phase==='battle'&&def.kind!=='passive'&&state.used.includes(i.uid))$('detail').insertAdjacentHTML('beforeend',`<p class="combat-preview">${quiet?'本时间片已执行；下一个时间片可再次使用。':'本回合已使用；下回合可再次使用。'}</p>`);
 if(i&&i.x!==null&&state.phase==='battle'&&def.kind!=='passive'&&!state.used.includes(i.uid)){
  const p=combatPreview(state,i.uid),summary=[];
  if(p.damage)summary.push(`${quiet?'本次实际输出':'本次实际伤害'} ${p.damageDealt}`);
  if(p.block)summary.push(`${quiet?'本次防护':'本次护甲'} +${p.block}`);
  if(p.heal)summary.push(`${quiet?'实际修复':'实际治疗'} ${p.healed}`);
  if(p.energy)summary.push(`${quiet?'本次预算':'本次体力'} +${Math.min(7-state.energy+def.cost,p.energy)}`);
  if(def.pierce)summary.push(quiet?'绕过屏障':'无视护甲');
  if(p.retaliation)summary.push(`${quiet?'回弹压力':'反击'} ${p.retaliation}（${quiet?'完整度损失':'生命损失'} ${p.retaliationDamage}）`);
  if(state.energy<def.cost)summary.push(quiet?'执行预算不足':'体力不足');
  if(p.hp===0)summary.push('⚠ 本次执行将导致失败');
  $('detail').insertAdjacentHTML('beforeend',`<p class="combat-preview">${esc(summary.join(' · '))}</p>`);
 }
 $('endTurnQuick').hidden=state.phase!=='battle';$('endTurnQuick').textContent=quiet?'结束时间片 →':'结束回合 →';$('activate').hidden=state.phase!=='battle';$('activate').disabled=!i||i.x===null||def.kind==='passive'||state.used.includes(i.uid)||state.energy<def.cost;
 for(const id of ['rotate','stash','sell','placeSelected'])$(id).disabled=!i||!editable;
 renderForge(i);$('stash').disabled=!i||!editable||i.x===null;$('sell').textContent=i?`${quiet?'回收':'出售'} +${resaleValue(i)}`:(quiet?'回收模块':'出售');
}
function renderForge(i){
 $('forgePanel').hidden=!i||state.phase!=='camp';$('forge').disabled=true;if(!i||state.phase!=='camp')return;
 const p=forgePreview(state,i.uid),reason=quiet?{classic:'经典运行不启用增量编译。',unsupported:'常驻模块与一次性补丁不支持增量编译。',max:'已达到修订上限 r2。',camp:'仅依赖更新阶段可编译。',funds:'资源点不足。'}:{classic:'经典存档不启用锻造。',unsupported:'被动物品与消耗品不能锻造。',max:'已达到强化上限 +2。',camp:'只能在营地锻造。',funds:'金币不足。'};
 $('forgeTitle').textContent=quiet?'增量编译':'营地锻造';
 const label=quiet?(p.stat==='damage'?'输出':'防护'):(p.stat==='damage'?'伤害':'护甲');
 const preview=p.reason==='unsupported'||p.reason==='classic'||p.reason==='max'?'':`${quiet?'修订':'等级'} ${p.level} → ${p.nextLevel} · ${label} ${p.before} → ${p.after} · ${quiet?'资源':'金币'} ${state.gold} → ${state.gold>=p.cost?state.gold-p.cost:'不足'}。 `;
 $('forgeHint').textContent=preview+(p.reason?reason[p.reason]:'')+` ${quiet?'回收值':'卖价'} ${p.resale}${!['classic','unsupported','max'].includes(p.reason)&&p.nextResale!==p.resale?` → ${p.nextResale}`:''}。`+(i.x===null&&!['unsupported','classic','max'].includes(p.reason)?(quiet?' 未加载时预览基础数值。':' 未装备时显示基础数值。'):'');
 $('forge').textContent=p.reason==='unsupported'?(quiet?'不支持编译':'不可强化'):p.reason==='classic'?(quiet?'经典协议禁用':'经典规则禁用'):p.cost===null?(quiet?'已达修订上限':'已达强化上限'):`${quiet?'编译 r':'强化 +'}${p.nextLevel} · ${p.cost} ${quiet?'资源点':'金币'}`;$('forge').disabled=!p.canForge;
}
$('forge').onclick=()=>{if(selected)execute(()=>forge(state,selected));};
function renderEncounter(){
 const battle=state.phase==='battle',camp=state.phase==='camp',enemy=ENEMIES[state.floor];
 $('phase').textContent=quiet?({prepare:'LAYOUT / 布局',battle:'RUNNING / 执行中',camp:'LINK / 依赖更新',won:'EXIT 0',lost:'FAULT'})[state.phase]:({prepare:'出发前整备',battle:'遭遇战',camp:'营地整备',won:'旅程完成',lost:'旅程结束'})[state.phase];
 $('turn').textContent=battle?`${quiet?'TICK':'回合'} ${state.turn}`:'';$('enemyName').textContent=quiet?enemy.quiet:enemy.name;$('enemyMark').textContent=quiet?'{ }':state.floor===7?'♜':'◇';
 $('enemyVitals').textContent=battle?`${quiet?'剩余负载':'生命'} ${state.enemy.hp} / ${enemy.hp} · ${quiet?'防护':'护甲'} ${state.enemy.block}`:`${quiet?'目标负载':'敌人生命'} ${camp?ENEMIES[state.floor+1]?.hp||enemy.hp:enemy.hp}`;
 if(camp)$('enemyName').textContent=quiet?`next: ${ENEMIES[state.floor+1].quiet}`:`下一层 · ${ENEMIES[state.floor+1].name}`;
 const [type,value]=intent(state);$('intent').textContent=battle?`${quiet?'下一次中断':'下一次敌方行动'}：${type==='attack'?(quiet?'施加压力':'攻击'):(quiet?'建立屏障':'获得护甲')} ${value}`:(quiet?'等待提交布局。':'准备好后再出发。');
 const target=camp?{...state,floor:state.floor+1}:state,trait=enemyTrait(target);
 $('enemyTrait').classList.toggle('elite',Boolean(trait));$('enemyTrait').innerHTML=trait?`<b>${camp?(quiet?'下层协议':'下层精英特性'):(quiet?'目标协议':'精英特性')} · ${quiet?trait.quiet:trait.name}</b><p>${esc(quiet?trait.qdesc:trait.desc)}</p>`:`<p>${state.version===1?(quiet?'经典协议：当前运行不启用新增约束。':'经典存档：本局不启用新增精英特性。'):(quiet?'常规协议：无额外约束。':'普通敌人：无额外特性。')}</p>`;
 $('battleHint').textContent=quiet?'每个时间片恢复 3 预算，临时防护重新初始化。相同模块每时间片限执行一次。':'每回合恢复 3 体力，旧护甲清空。每件物品每回合限用一次；敌方行动后进入下一回合。';
 $('start').hidden=!['prepare','camp'].includes(state.phase);$('start').disabled=camp&&!state.rewardTaken;$('start').textContent=camp?(quiet?'提交布局，进入下一层 →':'进入下一层 →'):(quiet?'提交布局并运行 →':'进入战斗 →');$('endTurn').hidden=!battle;
 $('ending').hidden=!['won','lost'].includes(state.phase);$('endKicker').textContent=quiet?'PROCESS EXIT':'EXPEDITION COMPLETE';$('endTitle').textContent=state.phase==='won'?(quiet?'全部目标已退出':'八层通关！'):(quiet?'运行完整度耗尽':'这一程，到这里休息');$('endText').textContent=quiet?`已处理深度 ${state.floor+1} / 8。调整模块邻接后，可以重启相同种子。`:`到达第 ${state.floor+1} / 8 层。${state.phase==='won'?'这只小背包，装下了一整段旅程。':'试试让磨刀石贴近多件武器，并保留防御和恢复手段。'}`;
}
function offerHTML(type,index,reward,bought=false){const def=ITEMS[type];return `<article class="offer"><div><b>${esc(name(type))}</b><span>${shape(type).length} ${quiet?'地址':'格'} · ${kind(type)}</span><p>${esc(description(type))}</p></div><button ${reward?`data-reward="${index}"`:`data-buy="${index}"`} ${bought||state.items.length>=MAX_ITEMS||!reward&&state.gold<def.price?'disabled':''}>${bought?(quiet?'已加载源':'已购买'):reward?(quiet?'选择依赖':'收入仓库'):`${quiet?'获取':'购买'} ${def.price}`}</button></article>`;}
function renderCamp(){ $('camp').hidden=state.phase!=='camp';if(state.phase!=='camp')return;$('rewards').innerHTML=state.rewardTaken?`<p class="empty">${quiet?'依赖选择已完成。可整理地址或继续执行。':'奖励已处理，可以整理背包或继续前进。'}</p>`:state.rewards.map((type,i)=>offerHTML(type,i,true)).join('');$('skip').disabled=state.rewardTaken;$('skip').textContent=quiet?'忽略 +3 资源点':'跳过 +3 金币';$('offers').innerHTML=state.offers.map((o,i)=>offerHTML(o.type,i,false,o.bought)).join('');$('rest').textContent=quiet?'修复 +10 / 4 点':'休整 +10 / 4 金币';$('rest').disabled=state.rested||state.hp===MAX_HP||state.gold<4;}
function renderLog(){
 const text=e=>({start:quiet?`开始执行 ${ENEMIES[e.floor]?.quiet}`:`遭遇 ${ENEMIES[e.floor]?.name}`,win:quiet?'目标退出，回收资源并修复 4 完整度。':'战斗胜利，获得金币并恢复 4 生命。',use:e.item?`${name(e.item)}：${(ITEMS[e.item]?.kind==='weapon'||ITEMS[e.item]?.damage)?`${quiet?'输出':'伤害'} ${e.damage||0} `:''}${e.block?`${quiet?'防护':'护甲'} +${e.block} `:''}${e.heal?`${quiet?'修复':'治疗'} +${e.heal} `:''}${e.energy?`${quiet?'预算':'体力'} +${e.energy}`:''}`:'',hit:quiet?`中断造成 ${e.damage||0} 完整度损失。`:`受到 ${e.damage||0} 点伤害。`,guard:quiet?`目标建立 ${e.block||0} 屏障。`:`敌方获得 ${e.block||0} 护甲。`,loot:e.item?`${quiet?'选择依赖':'获得'} ${name(e.item)}`:'',buy:e.item?`${quiet?'获取模块':'购入'} ${name(e.item)}`:'',sell:e.item?`${quiet?'回收模块':'出售'} ${name(e.item)}`:'',skip:quiet?'忽略依赖，回收 3 资源点。':'跳过奖励，获得 3 金币。',reflect:`${quiet?'回弹':'甲壳反击'}：${quiet?'完整度损失':'生命损失'} ${e.damage||0} · ${quiet?'防护吸收':'护甲抵挡'} ${e.absorbed||0}`,forge:e.item?`${quiet?'增量编译':'锻造'} ${name(e.item)} ${quiet?'r':'+'}${e.level} · ${quiet?'资源':'金币'} -${e.cost}`:'',rest:quiet?'执行修复，完整度 +10。':'营地休整，生命 +10。'})[e.type];
 $('log').innerHTML=state.log.slice(0,12).map(e=>`<li>${esc(text(e)||'操作已完成')}</li>`).join('')||`<li>${quiet?'沙箱就绪，等待提交布局。':'行囊已备好，旅程即将开始。'}</li>`;
}
function renderHelp(){ $('helpContent').innerHTML=quiet?'<p>这是本地沙箱风格的单人模块布局挑战。内存布局为 5 × 4 地址；未加载模块没有效果。点击模块检查，选择目标地址预览，再提交映射；再次点击已加载模块或选择映射地址可进入重映射。旋转与卸载只能在布局阶段进行。</p><p>每个时间片恢复 3 执行预算；每个主动模块限执行一次，补丁执行后卸载。常驻缓存提供起始防护，内联优化为边相邻指令增加输出，角接触不计。</p><p>下一次中断会显示压力值或屏障。结束时间片才处理中断；临时防护会在下个时间片重新初始化。削减目标负载至零后回收资源、修复 4 完整度，并选择下一层依赖。</p><p>共 8 层；模块源可获取新模块，布局阶段可回收旧模块，仓库最多 12 个。每个依赖更新阶段可用 4 资源点修复 10 完整度一次。种子可复现模块源和依赖，Alt+M 切换视图。</p>':'<p>这是受背包构筑玩法启发的原创简易游戏。5 × 4 背包共 20 格，只有装入背包的物品生效；仓库最多保存 12 件（含已装备）。点击物品查看，再次点击或按选择落点进入预览；点击格子后确认放置，或使用自动寻找空位。旋转失败时可先移回仓库。</p><p>每回合恢复 3 体力，每件主动装备每回合只可用一次。药草与活力瓶使用后消失。磨刀石强化边相邻的武器，匕首受相邻武器加成，盾受相邻板甲强化；同一物品即使接触多条边也只计一次。</p><p>使用装备不会立刻触发敌方行动；点击结束回合才结算预告的攻击或护甲。旧护甲在下一回合清空，板甲重新提供起始护甲。打倒敌人后恢复 4 生命，获得金币和奖励，最后击败第 8 层巨像。</p><p>营地奖励三选一，或跳过获得 3 金币；新物品进入仓库，需要自己放进背包。可以买物品、出售旧物品、花 4 金币恢复 10 生命（每营地一次）。布局在战斗中锁定。</p><p>自动存档，完全离线，无模型或付费调用。相同种子复现营地商品与奖励。Alt+M 切换运行时调试台，使用内存布局与模块术语。</p>'; $('helpContent').insertAdjacentHTML('beforeend',`<p>${quiet?'地址映射预览':'落点预览'}：文字提示是否可放，占用或越界时标红，并显示输出／防护变化。确认才改动布局，取消不消耗资源。布局撤销与重做最多保留 20 步，仅在本次打开页面有效；可用 Ctrl+Z、Ctrl+Shift+Z 或 Ctrl+Y。购买、出售、领奖、休整和进入战斗等操作会清空布局历史，不能撤销资源或战斗结算。输入框和弹窗中不拦截撤销快捷键。</p>`); $('helpContent').insertAdjacentHTML('beforeend',`<p>${quiet?'v2 新运行提供四种模块栈。调用优化器强化边相邻 RPC / DMA；DMA 绕过且不消耗目标屏障；隔离屏障提供高额防护；反馈指令随当前防护增大输出；恢复钩子让边相邻补丁额外修复并生成防护。深度 3 有非远程写入回弹，深度 5 预置屏障，深度 8 中断压力逐步提高。当前与下一层协议单独预告。经典运行保留原模块池与协议。':'v2 新局提供四种初始配置。箭袋强化边相邻弓弩；穿甲弩绕过护甲且不消耗敌方护甲；塔盾提供高额防护；护手战锤随当前护甲增伤；补给包让边相邻消耗品额外修复并获得防护。第 3 层反击近战，第 5 层预置护甲，第 8 层攻击逐渐提高。当前或下层特性会单独预告。旧版存档保持原物品池与敌人规则。'}</p>`); $('helpContent').insertAdjacentHTML('beforeend',`<p>${quiet?'增量编译：依赖更新阶段选中指令模块或防护模块，可用 5、8 资源点依次编译为 r1、r2，每次基础输出或防护 +3；常驻模块和一次性补丁不参与。':'营地锻造：选中武器、盾或塔盾，可花 5、8 金币依次强化到 +1、+2，每级基础伤害或护甲 +3；被动物品和消耗品不能锻造。'}当前布局加成照常叠加，形状与执行成本不变。卖价按原价加已支付强化费用的一半向下取整。强化会清空布局历史并自动保存；不消耗营地恢复次数，经典 v1 存档不启用此功能。</p>`);}
function renderBuildForm(){
 $('buildLabel').textContent=quiet?'初始模块栈（v2）':'起始行囊（v2 新局）';
 for(const o of $('buildInput').options)o.textContent=quiet?BUILDS[o.value].quiet:BUILDS[o.value].name;
 const build=BUILDS[$('buildInput').value];$('buildHint').textContent=(quiet?build.qdesc:build.desc)+(quiet?' 新建运行启用精英协议，每次依赖选择保证含一个一次性补丁。':' 新局启用精英特性，每次营地奖励保证包含一个消耗品。');
}
$('buildInput').onchange=renderBuildForm;
function select(uid){if(selected===uid&&['prepare','camp'].includes(state.phase))moving=!moving;else{selected=uid;moving=false;}anchor=null;render();}
function placing(){const i=state.items.find(i=>i.uid===selected);return ['prepare','camp'].includes(state.phase)&&i&&(moving||i.x===null)?i:null;}
function renderHistory(){const editable=['prepare','camp'].includes(state.phase);$('historyLabel').textContent=quiet?'布局历史（本次会话）':'布局历史（本次打开）';$('undoLayout').textContent=`撤销 ${layoutHistory.past.length}`;$('redoLayout').textContent=`重做 ${layoutHistory.future.length}`;$('undoLayout').disabled=!editable||!layoutHistory.past.length;$('redoLayout').disabled=!editable||!layoutHistory.future.length;}
function renderPlacement(){
 const editable=['prepare','camp'].includes(state.phase),i=state.items.find(i=>i.uid===selected),active=placing();
 $('moveSelected').textContent=quiet?'选择映射地址':'选择落点';$('confirmPlacement').textContent=quiet?'提交映射':'确认放置';$('cancelPlacement').textContent=quiet?'取消映射':'取消摆放';
 $('moveSelected').disabled=!editable||!i;$('cancelPlacement').disabled=!active;$('confirmPlacement').disabled=true;
 for(const cell of $('grid').querySelectorAll('[data-x]'))cell.classList.remove('drop-valid','drop-invalid','drop-anchor','drop-conflict');
 $('placementStatus').className='placement-status';
 if(!active){$('placementStatus').textContent=editable?(quiet?'选择模块后可预览地址映射，或撤销最近布局。':'选中物品后选择落点，可预览并撤销最近布局。'):(quiet?'运行期间地址锁定。':'战斗中布局锁定。');return;}
 if(!anchor){$('placementStatus').textContent=quiet?'将指针移至地址、用 Tab 聚焦地址或点击地址开始预览。':'将指针移到格子、用 Tab 聚焦格子或点击格子开始预览。';return;}
 const preview=previewPlacement(state,selected,anchor.x,anchor.y),keys=new Set(preview.cells.map(p=>p.join(',')));
 for(const cell of $('grid').querySelectorAll('[data-x]')){const key=`${cell.dataset.x},${cell.dataset.y}`;if(keys.has(key)){cell.classList.add(preview.valid?'drop-valid':'drop-invalid');if(cell.dataset.uid&&cell.dataset.uid!==selected)cell.classList.add('drop-conflict');}if(Number(cell.dataset.x)===anchor.x&&Number(cell.dataset.y)===anchor.y)cell.classList.add('drop-anchor');}
 const location=quiet?`0x${(anchor.y*COLS+anchor.x).toString(16).padStart(2,'0')}`:`${String.fromCharCode(65+anchor.x)}${anchor.y+1}`;
 if(!preview.valid){$('placementStatus').classList.add('invalid');$('placementStatus').textContent=`${location} · ${preview.outOfBounds?`越界 ${preview.outOfBounds} ${quiet?'地址':'格'}；`:''}${preview.conflicts.length?`已被 ${preview.conflicts.map(uid=>name(state.items.find(i=>i.uid===uid).type)).join('、')} 占用。`:''}`;return;}
 $('confirmPlacement').disabled=false;$('placementStatus').classList.add('valid');
 const changes=preview.changes.slice(0,4).map(c=>`${name(c.type)} ${(quiet?{damage:'输出',block:'防护',heal:'修复',energy:'预算'}:{damage:'伤害',block:'护甲',heal:'治疗',energy:'体力'})[c.stat]} ${c.before} → ${c.after}`).join('；');
 $('placementStatus').textContent=`${location} · ${quiet?'可提交映射':'可放置'} · ${changes||(quiet?'各项效果不变':'各项效果不变')}${preview.changes.length>4?'；…':''}`;
}
function aim(e){const b=e.target.closest('[data-x]');if(!b||!placing())return;const x=Number(b.dataset.x),y=Number(b.dataset.y);if(anchor?.x===x&&anchor?.y===y)return;anchor={x,y};renderPlacement();}
$('grid').addEventListener('pointerover',aim);$('grid').addEventListener('focusin',aim);
$('grid').onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;if(placing()){anchor={x:Number(b.dataset.x),y:Number(b.dataset.y)};renderPlacement();return;}if(b.dataset.uid)select(b.dataset.uid);};
$('moveSelected').onclick=()=>{if(!selected)return;moving=true;anchor=null;render();};
$('cancelPlacement').onclick=()=>{moving=false;anchor=null;if(state.items.find(i=>i.uid===selected)?.x===null)selected=null;render();};
$('confirmPlacement').onclick=()=>{if(placing()&&anchor)execute(()=>editLayout(state,layoutHistory,'place',selected,anchor.x,anchor.y),true);};
$('undoLayout').onclick=()=>execute(()=>undoLayout(state,layoutHistory),true);$('redoLayout').onclick=()=>execute(()=>redoLayout(state,layoutHistory),true);
$('inventory').onclick=e=>{const b=e.target.closest('[data-select]');if(b)select(b.dataset.select);};
for(const [id,action]of Object.entries({rotate:'rotate',stash:'stash',placeSelected:'autoPlace'}))$(id).onclick=()=>{if(selected)execute(()=>editLayout(state,layoutHistory,action,selected),true);};
for(const [id,fn]of Object.entries({activate,sell}))$(id).onclick=()=>{if(selected)execute(()=>fn(state,selected));};
$('start').onclick=()=>execute(()=>startBattle(state));$('endTurn').onclick=$('endTurnQuick').onclick=()=>execute(()=>endTurn(state));$('skip').onclick=()=>execute(()=>skipReward(state));$('rest').onclick=()=>execute(()=>rest(state));
$('rewards').onclick=e=>{const b=e.target.closest('[data-reward]');if(b&&!b.disabled)execute(()=>takeReward(state,Number(b.dataset.reward)));};$('offers').onclick=e=>{const b=e.target.closest('[data-buy]');if(b&&!b.disabled)execute(()=>buy(state,Number(b.dataset.buy)));};
function toggle(){quiet=!quiet;try{localStorage.setItem('packlab-view',quiet?'quiet':'standard');}catch{}render();}
$('view').onclick=toggle;document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.repeat&&!e.target.closest('input,textarea,[contenteditable=true]')&&!document.querySelector('dialog[open]')&&['prepare','camp'].includes(state.phase)){const action=e.code==='KeyZ'?(e.shiftKey?'redo':'undo'):e.code==='KeyY'?'redo':null;if(action){e.preventDefault();execute(()=>action==='undo'?undoLayout(state,layoutHistory):redoLayout(state,layoutHistory),true);return;}}if(e.code==='Escape'&&placing()&&!document.querySelector('dialog[open]')){$('cancelPlacement').click();return;}if(e.altKey&&e.code==='KeyM'&&!e.repeat){e.preventDefault();toggle();}});
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
for(const id of ['new','restart'])$(id).onclick=()=>{$('seedInput').value='';$('seedError').textContent='';$('buildInput').value=state.build||'balanced';renderBuildForm();$('newDialog').showModal();};$('cancelNew').onclick=()=>$('newDialog').close();$('confirmNew').onclick=()=>{try{const fresh=createGame($('seedInput').value.trim()||undefined,{build:$('buildInput').value});$('newDialog').close();state=fresh;selected=null;moving=false;anchor=null;clearLayoutHistory(state,layoutHistory);save();render();}catch(e){$('seedError').textContent=e.message;}};
save();render();
