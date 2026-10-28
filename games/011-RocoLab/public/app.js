import {STAT_LABELS,escapeHtml as e,defaultSkills,safeStored} from './engine.js';
const $=id=>document.getElementById(id);
let catalog,teams,battle=null,selected=null,side='a',busy=false,lastTrace=null,pendingRetry=null;
let calc={a:null,b:null,weather:'',skill:'',defenderAction:-1,power:null,hits:null};
const storedModel=safeStored('rocolab-endpoint',{});
let modelConfig={provider:storedModel.provider||'deepseek',base:storedModel.base||'https://api.deepseek.com',model:storedModel.model||'',key:''};
function notify(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
async function api(operation,data){
 const response=await fetch('./api/'+operation,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 let result;try{result=await response.json();}catch{throw Error('本地服务返回格式无效，请确认游戏库已重新启动');}
 if(!response.ok)throw Error(result.error||'本地请求失败');return result;
}
function saveTeams(){try{localStorage.setItem('rocolab-teams-v1',JSON.stringify(teams));}catch{notify('浏览器无法保存配置，可用“导出配置”保留。',true);}}
function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function tab(name){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));}
function configFor(name){const pet=catalog.pets.find(p=>p.name===name)||catalog.pets[0],skills=defaultSkills(pet,catalog.skills);if(!skills.length)throw Error('该精灵暂缺技能学习数据，请选择其他样本。');return {name:pet.name,skills,nature:'坦率',ivs:{}};}
function normalizeTeams(value){
 if(!value||!['a','b'].every(s=>Array.isArray(value[s])&&value[s].length>=1&&value[s].length<=6))throw Error('配置文件需要 a、b 两支队伍，每支 1–6 只');
 const result={};
 for(const s of ['a','b'])result[s]=value[s].map(p=>{
  const pet=catalog.pets.find(v=>v.name===p?.name);
  if(!pet||!Array.isArray(p.skills)||!p.skills.length||p.skills.length>4||new Set(p.skills).size!==p.skills.length||p.skills.some(n=>!pet.skills.includes(n)))throw Error('配置包含未知精灵、不可学习或重复的技能');
  if(!catalog.natures.includes(p.nature||'坦率'))throw Error('配置包含未知性格');
  const ivs=p.ivs||{};if(Object.entries(ivs).some(([k,v])=>!Object.hasOwn(STAT_LABELS,k)||![0,60].includes(v))||Object.values(ivs).filter(v=>v===60).length>3)throw Error('个体值最多三项为 60，其余为 0');
  return {name:p.name,skills:[...p.skills],nature:p.nature||'坦率',ivs:{...ivs}};
 });
 return result;
}
const options=(values,selected,empty=false)=>`${empty?'<option value="">— 不配置 —</option>':''}${values.map(v=>`<option value="${e(v)}" ${v===selected?'selected':''}>${e(v)}</option>`).join('')}`;
function renderTeams(){
 if(!catalog)return;
 $('teamEditor').innerHTML=`<div class="team-columns">${['a','b'].map(s=>`<div><div class="team-head"><h2>${s.toUpperCase()} / 样本队列</h2><label>载入预设<select data-preset="${s}" aria-label="${s.toUpperCase()} 侧预设"><option value="">选择样例…</option>${catalog.presets.map((p,i)=>`<option value="${i}">${e(p.name)}</option>`).join('')}</select></label></div>${teams[s].map((p,i)=>{
  const pet=catalog.pets.find(v=>v.name===p.name),known=pet.skills.filter(n=>catalog.skills.some(v=>v.name===n));
  return `<details class="sample" ${i===0?'open':''}><summary>${String(i+1).padStart(2,'0')} · ${e(p.name)} <span class="tag">${e(pet.type)}</span>${i===0?' <span class="tag">首发</span>':''}</summary><div class="sample-body" data-side="${s}" data-index="${i}"><div class="sample-fields"><label>精灵名称<input list="petNames" value="${e(p.name)}" data-pet aria-label="${s.toUpperCase()}${i+1} 精灵名称"></label><label>性格<select data-nature aria-label="${s.toUpperCase()}${i+1} 性格">${options(catalog.natures,p.nature)}</select></label></div><p class="ability-note">${e(pet.ability||'无特性说明')}<br><span class="coverage">${pet.abilityConfigured?'特性已有引擎配置 · 未逐一实机校准':'特性尚未配置 · 对战仅保留已实现效果'}</span></p><div class="skill-fields">${Array.from({length:4},(_,j)=>`<label>技能 ${j+1}<select data-skill="${j}" aria-label="${s.toUpperCase()}${i+1} 技能 ${j+1}">${options(known,p.skills[j],true)}</select></label>`).join('')}</div><div class="ivs" aria-label="个体值配置">${Object.entries(STAT_LABELS).map(([k,l])=>`<label><input type="checkbox" data-iv="${k}" ${p.ivs?.[k]===60?'checked':''}>${l} +60</label>`).join('')}</div><div class="sample-bottom"><span class="coverage">最多勾选三项个体值</span><div class="inline">${i>0?'<button data-move="up">上移</button>':''}${i<teams[s].length-1?'<button data-move="down">下移</button>':''}<button data-remove class="danger" ${teams[s].length===1?'disabled':''}>移除</button></div></div></div></details>`;
 }).join('')}<button data-add="${s}" ${teams[s].length>=6?'disabled':''}>+ 添加样本 (${teams[s].length}/6)</button></div>`).join('')}</div>`;
}
function renderPet(s){
 const p=battle.teams[s][battle.active[s]],mods=Object.entries(p.modifiers).map(([k,v])=>`${k} ${Math.round(v*100)}%`).join(' · '),status=Object.entries(p.status).map(([k,v])=>`${({poison_stacks:'中毒',burn_stacks:'灼烧',leech_stacks:'寄生',meteor_stacks:'星陨',cute_stacks:'萌化',frostbite_damage:'冻伤'})[k]} ${v}`).join(' · ');
 return `<article class="pet-card ${s==='b'?'enemy':''}"><div class="side">${s.toUpperCase()} / ACTIVE PROCESS <span class="tag">MP ${battle.mp[s]} / 4</span></div><h2>${e(p.name)} <span class="tag">${e(p.type)}</span></h2><div class="hp-text"><span>HP</span><span>${p.hp} / ${p.maxHp}</span></div><div class="bar"><span style="width:${Math.max(0,p.hp/p.maxHp*100)}%"></span></div><div class="energy">ENERGY ${p.energy} / 10</div><div class="stats-line">${Object.entries(p.stats).filter(([k])=>k!=='hp').map(([k,v])=>`<span>${STAT_LABELS[k]} ${v}</span>`).join('')}</div><div class="ability">${e(p.ability)} ${p.abilityConfigured?'':'<span class="coverage">[未配置]</span>'}</div>${mods||status?`<div class="status-line">${e([mods,status].filter(Boolean).join(' / '))}</div>`:''}</article>`;
}
function actionKey(action){return JSON.stringify(action);}
function renderBattle(){
 $('syncBattle').disabled=!battle||busy;$('createBattle').disabled=!catalog||busy;
 $('difficulty').disabled=$('mode').value==='local'||busy;
 if(!battle){$('battleArea').innerHTML='<div class="empty-state"><div class="terminal-glyph">&gt;_</div><h2>等待创建对局</h2><p>已准备两组示例队伍。可直接新建，也可先到“样本配置”调整。</p><button data-tab="teams">打开样本配置</button></div>';return;}
 const ended=battle.winner,local=battle.mode==='local';
 $('battleArea').innerHTML=`${ended?`<div class="result-banner" role="status"><strong>${ended==='draw'?'回合上限 · 平局':`${ended.toUpperCase()} 侧获胜`}</strong><p>本次运行结束。可导出回合记录，或用当前配置新建对局。</p></div>`:''}<div class="session-strip"><span>SESSION <strong>${battle.id.slice(0,8)}</strong> · TURN <strong>${String(battle.turn).padStart(3,'0')}</strong></span><span>${({preset:'PRESET POLICY',local:'LOCAL DUAL CONTROL',model:'MODEL ENDPOINT'})[battle.mode]} · ${battle.weather||'no weather'}</span></div><div class="battle-grid"><div><div class="combatants">${renderPet('a')}${renderPet('b')}</div><div class="panel rosters"><div class="panel-title"><span>样本队列 / ROSTER</span><small>自动接替 · 主动切换耗回合</small></div><table class="roster-table"><thead><tr><th>侧 / 序</th><th>样本</th><th>状态</th><th>HP</th><th class="energy-cell">能量</th></tr></thead><tbody>${['a','b'].map(s=>battle.teams[s].map((p,i)=>`<tr class="${battle.active[s]===i?'current':''} ${p.fainted?'fainted':''}"><td>${s.toUpperCase()}-${i+1}</td><td>${e(p.name)}</td><td>${p.fainted?'已倒下':battle.active[s]===i?'运行中':'待命'}</td><td>${p.hp}/${p.maxHp}</td><td class="energy-cell">${p.energy}</td></tr>`).join('')).join('')}</tbody></table><p class="instructions">${['a','b'].map(s=>`${s.toUpperCase()} 印记 ${Object.keys(battle.marks[s]).length?e(JSON.stringify(battle.marks[s])):'∅'}`).join('　/　')}</p></div></div><div class="panel commands"><div class="panel-title"><span>${ended?'运行已结束':`${side.toUpperCase()} 侧 / 提交指令`}</span><small>${local?'COMMIT & HANDOFF':'SIMULTANEOUS TURN'}</small></div>${ended?'<p class="instructions">本场所有指令已锁定。新建对局可继续。</p>':`<div class="command-stack">${battle.actions[side].map(a=>`<button class="action ${actionKey(a.id)===actionKey(selected)?'selected':''}" data-action="${e(actionKey(a.id))}" ${busy?'disabled':''}><span class="action-top"><strong>${e(a.label)}</strong><span class="tag">${a.kind==='skill'?`${e(a.type)} · ${a.cost} EN`:a.kind==='switch'?'SWITCH':'RECHARGE'}</span></span>${a.kind==='skill'?`<small>${e(a.category)} / 威力 ${a.power} / 基础直伤 ≈${a.baseDamage}</small><div class="description">${e(a.description)}</div>`:''}</button>`).join('')}</div><button id="commitAction" class="primary commit" ${!selected||busy?'disabled':''}>${busy?'正在处理…':local?`提交 ${side.toUpperCase()} 侧指令`:'提交并执行回合'}</button><p class="command-meta">${local?'另一侧当前指令在结算前隐藏':'对手同时决策，不读取你的当前指令'}</p>${pendingRetry?'<div class="inline"><button id="retryAction">重试接口</button><button id="fallbackAction">本次使用预设人机</button></div>':''}`}</div></div><div class="panel log-panel"><div class="panel-title"><span>回合追踪 / TRACE</span><div class="inline"><button id="showTrace" ${lastTrace?'':'disabled'}>模型调用</button><button id="exportBattle">导出回合</button></div></div><div class="event-log">${battle.history.length?battle.history.toReversed().map(h=>`<div class="event-line"><time>#${String(h.turn).padStart(3,'0')}</time>A ${e(h.a)}　/　B ${e(h.b)} ${h.automatic?'<span class="tag">人机接管</span>':''}${h.changes.map(c=>`<div class="change">${e(c)}</div>`).join('')}</div>`).join(''):'<p class="instructions">暂无回合记录。双方指令提交后在这里查看结算。</p>'}</div></div>`;
}
function calcPet(which){return calc[which]||teams[which][0];}
function renderCalculator(result){
 if(!catalog)return;
 const a=calcPet('a'),b=calcPet('b');
 if(!a.skills.includes(calc.skill))calc.skill=a.skills[0];
 const buildPanel=(which,title)=>{const p=calcPet(which),pet=catalog.pets.find(v=>v.name===p.name);return `<div class="panel" data-calc-side="${which}"><div class="panel-title"><span>${title}</span><small>${which.toUpperCase()} / SAMPLE</small></div><label>精灵名称<input list="petNames" data-calc-pet value="${e(p.name)}" aria-label="${title}精灵名称"></label><label>性格<select data-calc-nature aria-label="${title}性格">${options(catalog.natures,p.nature)}</select></label><div class="stat-inputs">${Object.entries(STAT_LABELS).map(([k,l])=>`<label>${l}<input type="number" min="1" max="2000" step="1" data-calc-stat="${k}" value="${p.stats?.[k]??''}" placeholder="种族 ${pet.bases[k]}" aria-label="${title}${l}"></label>`).join('')}</div><p class="instructions">留空按种族值、当前性格与个体值计算；输入为战斗面板值。</p><div class="sample-fields"><label>当前生命 %<input type="number" min="1" max="100" data-calc-hp value="${p.hpPercent??100}" aria-label="${title}当前生命百分比"></label><label>能量<input type="number" min="0" max="10" data-calc-energy value="${p.energy??10}" aria-label="${title}能量"></label></div><div class="sample-fields"><label>${which==='a'?'攻击提升':'防御提升'} %<input type="number" min="0" max="400" step="10" data-calc-up value="${Math.round((p.modifiers?.[which==='a'?'atk_up':'def_up']||0)*100)}" aria-label="${title}提升百分比"></label><label>${which==='a'?'攻击降低':'防御降低'} %<input type="number" min="0" max="90" step="10" data-calc-down value="${Math.round((p.modifiers?.[which==='a'?'atk_down':'def_down']||0)*100)}" aria-label="${title}降低百分比"></label></div><p class="instructions">提升 / 降低同时作用于物理与魔法方向。</p></div>`;};
 $('calculator').innerHTML=`<div class="calc-layout"><div><div class="calc-samples">${buildPanel('a','攻击侧')}${buildPanel('b','防御侧')}</div><div class="panel" style="margin-top:16px"><div class="calc-options" style="margin-top:0;padding-top:0;border:0"><label>攻击技能<select id="calcSkill">${options(catalog.pets.find(p=>p.name===a.name).skills.filter(n=>catalog.skills.some(s=>s.name===n)),calc.skill)}</select></label><label>防御侧指令<select id="calcDefenderAction"><option value="-1">聚能</option>${b.skills.map((n,i)=>`<option value="${i}" ${calc.defenderAction===i?'selected':''}>${e(n)}</option>`).join('')}</select></label><label>天气<select id="calcWeather"><option value="">无天气</option>${[['rain','雨天'],['snow','雪天'],['sandstorm','沙暴']].map(([v,l])=>`<option value="${v}" ${calc.weather===v?'selected':''}>${l}</option>`).join('')}</select></label></div><div class="calc-options"><label>威力覆盖<input id="calcPower" type="number" min="0" max="1000" value="${calc.power??''}" placeholder="技能默认"></label><label>连击覆盖<input id="calcHits" type="number" min="1" max="20" value="${calc.hits??''}" placeholder="技能默认"></label><button id="calculate" class="primary">执行推导</button><button id="resetCalc">重置输入</button></div></div></div><div class="panel" id="calcResult">${renderCalcResult(result)}</div></div>`;
}
function renderCalcResult(r){
 if(!r)return '<div class="panel-title"><span>数值推导 / OUTPUT</span><small>READY</small></div><p class="instructions">选择两侧样本和攻击技能，点击“执行推导”。</p><div class="formula" style="margin-top:25px">damage = floor(<br>　ATK / DEF × abilityLevel<br>　× power × 0.9<br>　× type × STAB<br>　× weather × hits<br>)</div><p class="calc-note">计算结果仅对应所列公式和社区引擎快照，尚未与最新赛季实机校准。</p>';
 const f=r.factors;
 return `<div class="panel-title"><span>基础直伤 / OUTPUT</span><small>DETERMINISTIC</small></div><div class="result-number">${r.damage}</div><div class="result-sub">占最大生命 ${r.percent}% · 剩余 ${r.remaining} HP</div><p class="instructions">纯直伤预计 ${r.hitsToKo??'∞'} 次击倒（忽略回复和其他效果）</p><div class="factor-list">${[['攻击 / 防御',`${f.attack} / ${f.defense}`],['能力修正',`${f.abilityLevel.toFixed(3)} ×`],['威力 / 连击',`${f.power} / ${f.hits}`],['系数',f.coefficient],['属性克制',`${f.effectiveness} ×`],['本系加成',`${f.stab} ×`],['天气加成',`${f.weather} ×`]].map(([l,v])=>`<div class="factor-row"><span>${l}</span><b>${v}</b></div>`).join('')}</div><div class="formula">floor(${f.attack} / ${f.defense} × ${f.abilityLevel.toFixed(3)} × ${f.power} × 0.9 × ${f.effectiveness} × ${f.stab} × ${f.weather} × ${f.hits})</div><p class="calc-note">${e(r.scope)}</p>${r.turnComparison?`<div class="turn-compare"><h3>效果引擎 · 一回合对照</h3><p>A：${r.turnComparison.aBefore} → ${r.turnComparison.aAfter} HP<br>B：${r.turnComparison.bBefore} → ${r.turnComparison.bAfter} HP</p><p>能量 A ${r.turnComparison.aEnergy} / B ${r.turnComparison.bEnergy}</p><p>这是回合净变化，包含特性、回复、持续效果、蓄力及防御侧指令。与上方基础直伤可不同。</p></div>`:''}`;
}
function readCalculator(){
 for(const which of ['a','b']){
  const panel=document.querySelector(`[data-calc-side="${which}"]`),p=structuredClone(calcPet(which));
  p.stats={};for(const input of panel.querySelectorAll('[data-calc-stat]'))if(input.value!=='')p.stats[input.dataset.calcStat]=Number(input.value);
  p.nature=panel.querySelector('[data-calc-nature]').value;p.hpPercent=Number(panel.querySelector('[data-calc-hp]').value);p.energy=Number(panel.querySelector('[data-calc-energy]').value);
  const up=Number(panel.querySelector('[data-calc-up]').value)/100,down=Number(panel.querySelector('[data-calc-down]').value)/100;
  p.modifiers=which==='a'?{atk_up:up,spatk_up:up,atk_down:down,spatk_down:down}:{def_up:up,spdef_up:up,def_down:down,spdef_down:down};
  calc[which]=p;
 }
 calc.skill=$('calcSkill').value;
 if(!calc.a.skills.includes(calc.skill))calc.a.skills=[...calc.a.skills.slice(0,3),calc.skill];
 calc.weather=$('calcWeather').value;calc.defenderAction=Number($('calcDefenderAction').value);calc.power=$('calcPower').value===''?null:Number($('calcPower').value);calc.hits=$('calcHits').value===''?null:Number($('calcHits').value);
}
async function commit(fallback=false,retry=false){
 if(busy||!battle||battle.winner)return;
 const action=retry?pendingRetry?.action:selected;if(!action)return;
 busy=true;renderBattle();notify(battle.mode==='model'&&!fallback?'正在请求模型决策，请保持页面打开…':'正在结算回合…');
 try{
  const result=await api('step',{id:battle.id,version:battle.version,side,action,config:battle.mode==='model'?modelConfig:undefined,fallback});
  battle=result;pendingRetry=null;selected=null;
  if(result.modelDecision){lastTrace=result.modelDecision.trace;notify(`模型已选择：${result.modelDecision.reason||'合法动作已执行'} · 请求 ${result.modelDecision.requestId}`);}
  else notify(fallback?'本回合已由预设人机接管。':'回合状态已更新。');
  try{sessionStorage.setItem('rocolab-session',battle.id);}catch{}
  if(battle.mode==='local'&&!battle.winner){side=battle.pending.includes('a')?'b':'a';$('handoffText').textContent=battle.pending.length?'A 侧已提交，接下来由 B 侧选择。当前指令在结算前隐藏。':'本回合已结算，接下来由 A 侧选择。';$('handoffDialog').showModal();}
 }catch(error){
  notify(error.message,true);
  if(battle.mode==='model')pendingRetry={action};
 }finally{busy=false;renderBattle();}
}
function showSettings(){for(const [id,key] of [['provider','provider'],['modelBase','base'],['modelName','model'],['modelKey','key']])$(id).value=modelConfig[key];$('settingsDialog').showModal();}
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.tab){tab(button.dataset.tab);return;}
 if(button.dataset.close){$(button.dataset.close).close();return;}
 try{
  if(button.id==='modelSettings'){showSettings();return;}
  if(button.id==='clearModel'){
   modelConfig={provider:'deepseek',base:'https://api.deepseek.com',model:'',key:''};
   try{localStorage.removeItem('rocolab-endpoint');}catch{}
   $('modelKey').value='';$('settingsDialog').close();notify('已清除模型设置与密钥。');return;
  }
  if(button.id==='createBattle'){
   if(busy)return;
   if($('mode').value==='model'&&!modelConfig.key){showSettings();notify('请先填写模型设置，然后新建对局。');return;}
   busy=true;button.disabled=true;
   try{battle=await api('create',{teams,mode:$('mode').value,difficulty:$('difficulty').value});side='a';selected=null;pendingRetry=null;lastTrace=null;sessionStorage.setItem('rocolab-session',battle.id);notify('对局已创建。双方使用公开队伍，当前回合指令独立提交。');}finally{busy=false;renderBattle();}
  }
  if(button.id==='syncBattle'){
   if(busy)return;busy=true;renderBattle();
   try{battle=await api('get',{id:battle.id});side=battle.pending.includes('a')?'b':'a';selected=null;pendingRetry=null;notify('已同步本地对局。');}finally{busy=false;renderBattle();}
  }
  if(button.dataset.action){selected=JSON.parse(button.dataset.action);pendingRetry=null;renderBattle();}
  if(button.id==='commitAction')await commit();
  if(button.id==='retryAction')await commit(false,true);
  if(button.id==='fallbackAction')await commit(true,true);
  if(button.id==='acceptHandoff')$('handoffDialog').close();
  if(button.id==='exportTeams')download('rocolab-teams.json',{version:1,teams});
  if(button.id==='importTeams')$('importFile').click();
  if(button.dataset.add){const s=button.dataset.add;if(teams[s].length<6){const pet=catalog.pets.find(p=>!teams[s].some(v=>v.name===p.name));teams[s].push(configFor(pet.name));saveTeams();renderTeams();}}
  const sample=button.closest('.sample-body');
  if(sample){const s=sample.dataset.side,i=Number(sample.dataset.index);if(button.hasAttribute('data-remove')&&teams[s].length>1)teams[s].splice(i,1);if(button.dataset.move){const j=i+(button.dataset.move==='up'?-1:1);[teams[s][i],teams[s][j]]=[teams[s][j],teams[s][i]];}saveTeams();renderTeams();}
  if(button.id==='calculate'){
   readCalculator();button.disabled=true;
   try{const result=await api('calculate',{attacker:calc.a,defender:calc.b,skill:calc.skill,weather:calc.weather,power:calc.power,hits:calc.hits,defenderAction:calc.defenderAction});renderCalculator(result);notify('推导完成。基础直伤与一回合净变化分别列出。');}finally{const b=$('calculate');if(b)b.disabled=false;}
  }
  if(button.id==='resetCalc'){calc={a:structuredClone(teams.a[0]),b:structuredClone(teams.b[0]),weather:'',skill:'',defenderAction:-1,power:null,hits:null};renderCalculator();}
  if(button.id==='calcFromBattle'){
   if(!battle){notify('请先新建对局，或直接用样本配置进行计算。',true);return;}
   for(const s of ['a','b']){const p=battle.teams[s][battle.active[s]];calc[s]={name:p.name,skills:p.skills.map(v=>v.name),nature:p.nature,ivs:{},stats:p.stats,hpPercent:Math.max(1,p.hp/p.maxHp*100),energy:p.energy,modifiers:p.modifiers};}
   calc.skill='';calc.defenderAction=-1;calc.power=null;calc.hits=null;calc.weather=battle.weather||'';renderCalculator();notify('已读取登场精灵的面板与能量；印记及持续状态不随基础计算输入复制。');
  }
  if(button.id==='exportBattle'&&battle)download('rocolab-battle.json',battle);
  if(button.id==='showTrace'&&lastTrace){$('traceContent').textContent=JSON.stringify(lastTrace,null,2);$('traceDialog').showModal();}
  if(button.id==='exportTrace'&&lastTrace)download('rocolab-model-trace.json',lastTrace);
 }catch(error){notify(error.message,true);}
});
document.addEventListener('change',async event=>{
 const input=event.target;
 try{
  if(input.dataset.preset){const s=input.dataset.preset,index=input.value;if(index!==''){teams[s]=structuredClone(catalog.presets[Number(index)].team);saveTeams();renderTeams();}return;}
  if(input.id==='provider'){
   if(input.value==='deepseek'){$('modelBase').value='https://api.deepseek.com';$('modelName').value='';}
   if(input.value==='openai'){$('modelBase').value='https://api.openai.com/v1';$('modelName').value='';}
  }
  if(input.id==='mode')$('difficulty').disabled=input.value==='local';
  const sample=input.closest('.sample-body');
  if(sample){
   const s=sample.dataset.side,i=Number(sample.dataset.index),p=teams[s][i];
   if(input.hasAttribute('data-pet')){if(!catalog.pets.some(p=>p.name===input.value)){notify('请选择数据列表中的完整精灵名称。',true);input.value=p.name;return;}teams[s][i]=configFor(input.value);saveTeams();renderTeams();return;}
   if(input.hasAttribute('data-nature'))p.nature=input.value;
   if(input.dataset.skill!==undefined){const slots=[...sample.querySelectorAll('[data-skill]')].map(v=>v.value).filter(Boolean);if(new Set(slots).size!==slots.length){notify('技能不能重复。',true);renderTeams();return;}p.skills=slots;}
   if(input.dataset.iv){const values=[...sample.querySelectorAll('[data-iv]:checked')];if(values.length>3){input.checked=false;notify('最多三项个体值为 60。',true);return;}p.ivs=Object.fromEntries(values.map(v=>[v.dataset.iv,60]));}
   saveTeams();
  }
  const calcPanel=input.closest('[data-calc-side]');
  if(calcPanel&&input.hasAttribute('data-calc-pet')){
   const s=calcPanel.dataset.calcSide;if(!catalog.pets.some(p=>p.name===input.value)){input.value=calcPet(s).name;notify('请选择完整精灵名称。',true);return;}
   readCalculator();calc[s]=configFor(input.value);if(s==='a')calc.skill='';else calc.defenderAction=-1;renderCalculator();
  }
  if(input.id==='importFile'){
   const file=input.files?.[0];if(!file)return;if(file.size>100000)throw Error('配置文件过大');
   const data=JSON.parse(await file.text());teams=normalizeTeams(data.teams||data);saveTeams();renderTeams();notify('已导入样本配置，用于下一场对局。');input.value='';
  }
 }catch(error){notify(error.message,true);}
});
$('settingsForm').addEventListener('submit',event=>{
 event.preventDefault();modelConfig={provider:$('provider').value,base:$('modelBase').value.trim(),model:$('modelName').value.trim(),key:$('modelKey').value.trim()};
 try{localStorage.setItem('rocolab-endpoint',JSON.stringify({provider:modelConfig.provider,base:modelConfig.base,model:modelConfig.model}));}catch{}
 $('settingsDialog').close();notify('模型设置已应用，密钥仅保留在本页内存。');
});
$('handoffDialog').addEventListener('cancel',event=>event.preventDefault());
async function init(){
 try{
  catalog=await api('catalog');
  const starter=structuredClone(catalog.presets[0].team);
  const defaults={a:starter,b:structuredClone([...starter.slice(1),starter[0]])};
  try{teams=normalizeTeams(safeStored('rocolab-teams-v1',defaults));}catch{teams=defaults;}
  $('petNames').innerHTML=catalog.pets.map(p=>`<option value="${e(p.name)}">${e(p.type)}</option>`).join('');
  $('footerStatus').textContent=`${catalog.pets.length} species / ${catalog.skills.length} skills / snapshot ${catalog.source.date}`;
  $('dataSummary').innerHTML=[[catalog.pets.length,'精灵数据'],[catalog.skills.length,'技能数据'],[catalog.source.skillsConfigured,'技能已有配置'],[catalog.source.abilitiesConfigured,'精灵特性已有配置']].map(([n,l])=>`<div><strong>${n}</strong><span>${l}</span></div>`).join('');
  calc.a=structuredClone(teams.a[0]);calc.b=structuredClone(teams.b[0]);
  renderTeams();renderCalculator();renderBattle();notify('本地规则已就绪。当前为社区数据快照，可在“规则与来源”查看范围。');
  let saved;try{saved=sessionStorage.getItem('rocolab-session');}catch{}
  if(saved)try{battle=await api('get',{id:saved});side=battle.pending.includes('a')?'b':'a';$('mode').value=battle.mode;$('difficulty').value=battle.difficulty;renderBattle();notify('已恢复本地服务中的对局。');}catch{sessionStorage.removeItem('rocolab-session');}
 }catch(error){notify(error.message,true);$('battleArea').innerHTML='<div class="empty-state"><h2>规则数据未就绪</h2><p>请确认已重启游戏库，并安装 Python 3.10+。也可设置 ROCO_PYTHON 为解释器路径。</p></div>';}
}
init();
