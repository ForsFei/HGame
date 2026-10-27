export const COLS=5,ROWS=4,MAX_ITEMS=12,MAX_HP=40;
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
export const ITEMS={
 blade:{name:'旅行短剑',quiet:'ALU 指令',code:'ALU',shape:rect(2,1),kind:'weapon',cost:1,damage:6,price:6,desc:'造成 6 点伤害。',qdesc:'消耗 1 执行预算，削减 6 目标负载。'},
 shield:{name:'木纹盾',quiet:'异常屏障',code:'GUARD',shape:rect(1,2),kind:'guard',cost:1,block:7,price:5,desc:'获得 7 点护甲；每相邻一件板甲额外 +2。',qdesc:'生成 7 临时防护；每相邻一个常驻缓存额外 +2。'},
 spear:{name:'长柄矛',quiet:'向量指令',code:'SIMD',shape:rect(1,3),kind:'weapon',cost:2,damage:15,price:8,desc:'造成 15 点伤害。',qdesc:'消耗 2 执行预算，削减 15 目标负载。'},
 hammer:{name:'重锤',quiet:'批处理核',code:'BATCH',shape:rect(2,2),kind:'weapon',cost:2,damage:21,price:10,desc:'造成 21 点伤害。',qdesc:'消耗 2 执行预算，削减 21 目标负载。'},
 bow:{name:'游猎弓',quiet:'远端调用',code:'RPC',shape:rect(3,1),kind:'weapon',cost:1,damage:7,price:8,desc:'造成 7 点伤害；位于背包最右边缘时额外 +4。',qdesc:'削减 7 目标负载；模块接触内存右边界时额外 +4。'},
 armor:{name:'板甲',quiet:'常驻缓存',code:'CACHE',shape:rect(2,2),kind:'passive',block:4,price:7,desc:'每回合开始获得 4 点护甲，并强化相邻的盾。',qdesc:'每个时间片开始生成 4 临时防护，并强化相邻异常屏障。'},
 stone:{name:'磨刀石',quiet:'内联优化',code:'INLINE',shape:rect(1,1),kind:'passive',price:6,desc:'与它边相邻的武器伤害 +3；同件物品只计算一次。',qdesc:'边相邻的指令模块输出 +3；同一邻接模块只计一次。'},
 herb:{name:'药草',quiet:'热修复',code:'PATCH',shape:rect(1,1),kind:'consume',cost:0,heal:10,price:4,desc:'恢复 10 点生命，使用后消失。',qdesc:'恢复 10 运行完整度，执行后卸载。'},
 flask:{name:'活力瓶',quiet:'预算扩展',code:'BURST',shape:rect(1,2),kind:'consume',cost:0,energy:2,price:5,desc:'本回合体力 +2（上限 7），使用后消失。',qdesc:'当前时间片执行预算 +2（上限 7），执行后卸载。'},
 dagger:{name:'折叠匕首',quiet:'微指令',code:'uOP',shape:rect(1,1),kind:'weapon',cost:1,damage:4,price:5,desc:'造成 4 点伤害；每相邻一件其他武器额外 +2。',qdesc:'削减 4 目标负载；每相邻一个其他指令模块输出 +2。'},
 pouch:{name:'拾荒袋',quiet:'资源回收器',code:'GC',shape:rect(2,1),kind:'passive',price:5,desc:'战斗胜利时额外获得 3 金币。',qdesc:'目标退出时额外回收 3 资源点。'},
 spark:{name:'折角刃',quiet:'流水单元',code:'PIPE',shape:[[0,0],[0,1],[1,1]],kind:'weapon',cost:1,damage:9,price:8,desc:'造成 9 点伤害；占据 L 形三格。',qdesc:'削减 9 目标负载；占据 L 形三个地址。'}
};
export const ENEMIES=[
 {name:'苔原斥候',quiet:'worker-01',hp:18,intents:[['attack',5],['attack',7],['guard',4]]},
 {name:'石巷守卫',quiet:'lock-02',hp:26,intents:[['guard',6],['attack',8],['attack',6]]},
 {name:'赤羽猎手',quiet:'daemon-03',hp:34,intents:[['attack',8],['guard',5],['attack',11]]},
 {name:'遗迹卫兵',quiet:'mutex-04',hp:42,intents:[['attack',9],['attack',9],['guard',8]]},
 {name:'岩壳巨兽',quiet:'kernel-05',hp:52,intents:[['guard',10],['attack',12],['attack',10]]},
 {name:'风暴行者',quiet:'storm-06',hp:62,intents:[['attack',12],['attack',14],['guard',8]]},
 {name:'深层守望',quiet:'watchdog-07',hp:72,intents:[['attack',13],['guard',12],['attack',16]]},
 {name:'高塔巨像',quiet:'root-08',hp:88,intents:[['attack',14],['guard',14],['attack',18]]}
];
const fail=message=>{throw Error(message);};
const item=(s,uid)=>s.items.find(i=>i.uid===uid)||fail('找不到这件物品');
const editable=s=>{if(!['prepare','camp'].includes(s.phase))fail('只能在整备阶段调整布局');};
export function shape(type,rotation=0){let cells=ITEMS[type].shape.map(p=>[...p]);for(let n=0;n<rotation;n++)cells=cells.map(([x,y])=>[-y,x]);const minX=Math.min(...cells.map(p=>p[0])),minY=Math.min(...cells.map(p=>p[1]));return cells.map(([x,y])=>[x-minX,y-minY]);}
export const cellsFor=i=>i.x===null?[]:shape(i.type,i.rotation).map(([x,y])=>[x+i.x,y+i.y]);
export function occupants(s){const map=new Map();for(const i of s.items)for(const [x,y]of cellsFor(i))map.set(`${x},${y}`,i.uid);return map;}
export function fits(s,i,x,y,rotation=i.rotation){const occupied=occupants({...s,items:s.items.filter(o=>o.uid!==i.uid)});return shape(i.type,rotation).every(([dx,dy])=>x+dx>=0&&x+dx<COLS&&y+dy>=0&&y+dy<ROWS&&!occupied.has(`${x+dx},${y+dy}`));}
export function neighbours(s,i){const mine=cellsFor(i),near=new Set(mine.flatMap(([x,y])=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].map(p=>p.join(','))));return s.items.filter(o=>o.uid!==i.uid&&cellsFor(o).some(p=>near.has(p.join(','))));}
export function effects(s,i){const def=ITEMS[i.type],near=neighbours(s,i);return {damage:(def.damage||0)+(def.kind==='weapon'?near.filter(o=>o.type==='stone').length*3:0)+(i.type==='dagger'?near.filter(o=>ITEMS[o.type].kind==='weapon').length*2:0)+(i.type==='bow'&&cellsFor(i).some(([x])=>x===COLS-1)?4:0),block:(def.block||0)+(i.type==='shield'?near.filter(o=>o.type==='armor').length*2:0),heal:def.heal||0,energy:def.energy||0};}
function rng(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return()=>{n=(n+0x6D2B79F5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function sample(keys,random,count){const a=[...keys];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,count);}
const log=(s,event)=>{s.log=[event,...s.log].slice(0,30);};
function add(s,type){const i={uid:`i${s.nextId++}`,type,x:null,y:null,rotation:0};s.items.push(i);return i;}
export function createGame(seed=globalThis.crypto?.randomUUID?.().slice(0,8)||'PACKLAB'){
 seed=String(seed).trim().toUpperCase();if(!/^[A-Z0-9-]{1,24}$/.test(seed))fail('编号需为 1–24 位字母、数字或短横线');
 const s={version:1,seed,phase:'prepare',floor:0,hp:MAX_HP,gold:6,items:[],nextId:1,turn:0,energy:0,block:0,used:[],enemy:null,rewards:[],offers:[],rewardTaken:false,rested:false,log:[]};
 for(const [type,x,y]of [['blade',0,0],['shield',3,0],['stone',1,1],['herb',4,3]])Object.assign(add(s,type),{x,y});return s;
}
export function place(s,uid,x,y){editable(s);const i=item(s,uid);if(!Number.isInteger(x)||!Number.isInteger(y)||!fits(s,i,x,y))fail('位置越界或已被占用');Object.assign(i,{x,y});}
export function stash(s,uid){editable(s);Object.assign(item(s,uid),{x:null,y:null});}
export function rotate(s,uid){editable(s);const i=item(s,uid),rotation=(i.rotation+1)%4;if(i.x!==null&&!fits(s,i,i.x,i.y,rotation))fail('旋转后空间不足，请先移回仓库');i.rotation=rotation;}
export function autoPlace(s,uid){editable(s);const i=item(s,uid);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(fits(s,i,x,y)){place(s,uid,x,y);return;}fail('当前方向没有可用空间，可旋转后重试');}
export function previewPlacement(s,uid,x,y){
 editable(s);const i=item(s,uid);if(!Number.isInteger(x)||!Number.isInteger(y))fail('落点坐标无效');
 const cells=shape(i.type,i.rotation).map(([dx,dy])=>[x+dx,y+dy]),occupied=occupants({...s,items:s.items.filter(o=>o.uid!==uid)});
 const outOfBounds=cells.filter(([cx,cy])=>cx<0||cx>=COLS||cy<0||cy>=ROWS).length;
 const conflicts=[...new Set(cells.map(p=>occupied.get(p.join(','))).filter(Boolean))],valid=outOfBounds===0&&conflicts.length===0,changes=[];
 if(valid){
  const candidate={...s,items:s.items.map(o=>o.uid===uid?{...o,x,y}:o)};
  for(const after of candidate.items){
   const before=s.items.find(o=>o.uid===after.uid),a=after.x===null?{damage:0,block:0}:effects(candidate,after),b=before.x===null?{damage:0,block:0}:effects(s,before);
   for(const stat of ['damage','block'])if(a[stat]!==b[stat])changes.push({uid:after.uid,type:after.type,stat,before:b[stat],after:a[stat]});
  }
 }
 return {valid,cells,outOfBounds,conflicts,changes};
}
const layoutSnapshot=s=>s.items.map(({uid,type,x,y,rotation})=>({uid,type,x,y,rotation}));
const layoutKey=s=>`${s.phase}/${s.floor}/${s.items.map(i=>`${i.uid}:${i.type}`).join(',')}`;
export const createLayoutHistory=s=>({key:layoutKey(s),current:JSON.stringify(layoutSnapshot(s)),past:[],future:[]});
export function clearLayoutHistory(s,h){Object.assign(h,createLayoutHistory(s));}
function historyMatches(s,h){return h.key===layoutKey(s)&&h.current===JSON.stringify(layoutSnapshot(s));}
export function editLayout(s,h,action,uid,...args){
 editable(s);const actions={place,stash,rotate,autoPlace};if(!Object.hasOwn(actions,action))fail('未知布局操作');const fn=actions[action];
 if(!historyMatches(s,h))clearLayoutHistory(s,h);
 const before=layoutSnapshot(s);fn(s,uid,...args);const current=JSON.stringify(layoutSnapshot(s));
 if(current===h.current)return false;
 h.past.push(before);h.past=h.past.slice(-20);h.future=[];h.current=current;return true;
}
function restoreLayout(s,h,direction){
 editable(s);if(!historyMatches(s,h)){clearLayoutHistory(s,h);fail('布局历史已重置，请从当前布局继续');}
 const source=direction==='undo'?h.past:h.future,target=direction==='undo'?h.future:h.past,snapshot=source.at(-1);
 if(!snapshot)fail(direction==='undo'?'没有可撤销的布局':'没有可重做的布局');
 const items=s.items.map(i=>({...i,...snapshot.find(o=>o.uid===i.uid)}));
 const candidate={...s,items};if(!items.every(i=>i.x===null||fits(candidate,i,i.x,i.y)))fail('历史布局不再适用');
 target.push(layoutSnapshot(s));source.pop();s.items=items;h.current=JSON.stringify(layoutSnapshot(s));
}
export const undoLayout=(s,h)=>restoreLayout(s,h,'undo');
export const redoLayout=(s,h)=>restoreLayout(s,h,'redo');
export function intent(s){return ENEMIES[s.floor].intents[s.enemy?.intentIndex||0];}
function startTurn(s){s.energy=3;s.block=s.items.filter(i=>i.x!==null&&i.type==='armor').length*4;s.used=[];}
export function startBattle(s){if(!['prepare','camp'].includes(s.phase))fail('当前不能进入战斗');if(s.phase==='camp'&&!s.rewardTaken)fail('请先选择或跳过奖励');if(!s.items.some(i=>i.x!==null&&ITEMS[i.type].kind==='weapon'))fail('请至少装备一件武器');if(s.phase==='camp')s.floor++;s.phase='battle';s.turn=1;s.enemy={hp:ENEMIES[s.floor].hp,block:0,intentIndex:0};startTurn(s);log(s,{type:'start',floor:s.floor});}
function victory(s){s.gold+=5+s.floor+s.items.filter(i=>i.x!==null&&i.type==='pouch').length*3;s.hp=Math.min(MAX_HP,s.hp+4);log(s,{type:'win',floor:s.floor});if(s.floor===7){s.phase='won';return;}s.phase='camp';s.rewardTaken=false;s.rested=false;const random=rng(`${s.seed}/camp/${s.floor}`);s.rewards=sample(Object.keys(ITEMS),random,3);s.offers=sample(Object.keys(ITEMS),random,3).map(type=>({type,bought:false}));}
export function activate(s,uid){if(s.phase!=='battle')fail('当前不在战斗阶段');const i=item(s,uid),def=ITEMS[i.type];if(i.x===null||def.kind==='passive')fail('此物品不能主动使用');if(s.used.includes(uid))fail('本回合已经使用过此物品');if(s.energy<def.cost)fail('体力不足');const e=effects(s,i);s.energy-=def.cost;s.used.push(uid);const damage=Math.max(0,e.damage-s.enemy.block);s.enemy.block=Math.max(0,s.enemy.block-e.damage);s.enemy.hp=Math.max(0,s.enemy.hp-damage);s.block+=e.block;const healed=Math.min(MAX_HP-s.hp,e.heal),gained=Math.min(7-s.energy,e.energy);s.hp+=healed;s.energy+=gained;if(def.kind==='consume')s.items=s.items.filter(o=>o.uid!==uid);log(s,{type:'use',item:i.type,damage,block:e.block,heal:healed,energy:gained});if(s.enemy.hp===0)victory(s);return e;}
export function endTurn(s){if(s.phase!=='battle')fail('当前不在战斗阶段');const [type,value]=intent(s);s.enemy.block=0;if(type==='attack'){const damage=Math.max(0,value-s.block);s.hp=Math.max(0,s.hp-damage);log(s,{type:'hit',damage});}else{s.enemy.block=value;log(s,{type:'guard',block:value});}if(s.hp===0){s.phase='lost';return;}s.enemy.intentIndex=(s.enemy.intentIndex+1)%ENEMIES[s.floor].intents.length;s.turn++;startTurn(s);}
export function takeReward(s,index){if(s.phase!=='camp'||s.rewardTaken||!s.rewards[index])fail('奖励不可领取');if(s.items.length>=MAX_ITEMS)fail('仓库已满，请先出售物品或跳过奖励');const i=add(s,s.rewards[index]);s.rewardTaken=true;log(s,{type:'loot',item:i.type});return i.uid;}
export function skipReward(s){if(s.phase!=='camp'||s.rewardTaken)fail('奖励不可领取');s.rewardTaken=true;s.gold+=3;log(s,{type:'skip'});}
export function buy(s,index){const o=s.offers[index];if(s.phase!=='camp'||!o||o.bought)fail('商品不可购买');if(s.items.length>=MAX_ITEMS)fail('仓库已满，请先出售物品');if(s.gold<ITEMS[o.type].price)fail('金币不足');s.gold-=ITEMS[o.type].price;const i=add(s,o.type);o.bought=true;log(s,{type:'buy',item:i.type});return i.uid;}
export function sell(s,uid){editable(s);const i=item(s,uid);if(s.items.filter(o=>ITEMS[o.type].kind==='weapon').length===1&&ITEMS[i.type].kind==='weapon')fail('至少保留一件武器');s.gold+=Math.floor(ITEMS[i.type].price/2);s.items=s.items.filter(o=>o.uid!==uid);log(s,{type:'sell',item:i.type});}
export function rest(s){if(s.phase!=='camp'||s.rested||s.hp===MAX_HP||s.gold<4)fail('本次无法休整：需要 4 金币且生命未满');s.gold-=4;s.hp=Math.min(MAX_HP,s.hp+10);s.rested=true;log(s,{type:'rest'});}
export function validSave(s){
 if(!s||s.version!==1||!['prepare','battle','camp','won','lost'].includes(s.phase)||!Number.isInteger(s.floor)||s.floor<0||s.floor>7||typeof s.seed!=='string'||!/^[A-Z0-9-]{1,24}$/.test(s.seed))return false;
 if(!['hp','gold','turn','energy','block','nextId'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)||s.hp>MAX_HP||s.energy>7||s.nextId<1)return false;
 if(!Array.isArray(s.items)||s.items.length>MAX_ITEMS||new Set(s.items.map(i=>i?.uid)).size!==s.items.length||!s.items.every(i=>i&&/^i[1-9]\d*$/.test(i.uid)&&Number(i.uid.slice(1))<s.nextId&&Object.hasOwn(ITEMS,i.type)&&Number.isInteger(i.rotation)&&i.rotation>=0&&i.rotation<4&&(i.x===null&&i.y===null||Number.isInteger(i.x)&&Number.isInteger(i.y))))return false;
 if(!s.items.every(i=>i.x===null||fits(s,i,i.x,i.y)))return false;
 if(!Array.isArray(s.used)||s.used.length>MAX_ITEMS||new Set(s.used).size!==s.used.length||!s.used.every(id=>typeof id==='string'&&/^i[1-9]\d*$/.test(id)&&Number(id.slice(1))<s.nextId)||typeof s.rewardTaken!=='boolean'||typeof s.rested!=='boolean')return false;
 if(!Array.isArray(s.rewards)||s.rewards.length>3||!s.rewards.every(t=>Object.hasOwn(ITEMS,t))||!Array.isArray(s.offers)||s.offers.length>3||!s.offers.every(o=>o&&Object.hasOwn(ITEMS,o.type)&&typeof o.bought==='boolean'))return false;
 if(!Array.isArray(s.log)||s.log.length>30||!s.log.every(e=>e&&['start','win','use','hit','guard','loot','skip','buy','sell','rest'].includes(e.type)&&(e.item===undefined||Object.hasOwn(ITEMS,e.item))))return false;
 if(['battle','lost','won','camp'].includes(s.phase)&&(!s.enemy||!Number.isInteger(s.enemy.hp)||s.enemy.hp<0||s.enemy.hp>ENEMIES[s.floor].hp||!Number.isSafeInteger(s.enemy.block)||s.enemy.block<0||!Number.isInteger(s.enemy.intentIndex)||s.enemy.intentIndex<0||s.enemy.intentIndex>=ENEMIES[s.floor].intents.length))return false;
 if(s.phase==='prepare'&&(s.floor!==0||s.enemy!==null)||s.phase==='camp'&&(s.floor>=7||s.rewards.length!==3||s.offers.length!==3||s.enemy.hp!==0)||s.phase!=='lost'&&s.hp===0)return false;
 if(s.phase==='lost'&&s.hp!==0||s.phase==='won'&&(s.floor!==7||s.enemy.hp!==0)||s.phase==='battle'&&(s.hp===0||s.enemy.hp===0))return false;return true;
}
