import {GAMES,gameUrl} from './catalog.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let quiet=document.documentElement.dataset.view==='quiet',scope='all',storageWarning=false;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{storageWarning=true;}}
let favorites=read('hgame-library-favorites',[]),recent=read('hgame-library-recent',[]);
favorites=Array.isArray(favorites)?favorites.filter(id=>GAMES.some(g=>g.id===id)):[];
recent=Array.isArray(recent)?recent.filter(r=>r&&GAMES.some(g=>g.id===r.id)&&Number.isFinite(r.at)).sort((a,b)=>b.at-a.at).slice(0,10):[];
const categories=[...new Set(GAMES.map(g=>g.category))],qcategory={'策略构筑':'组合与执行','文字推理':'字符串分析','逻辑解谜':'逻辑校验','轻松挂机':'资源调度'};
const qtags={'单人':'本地','本地多人':'多方案','可选 AI':'模型接口','构筑':'模块组合','每日挑战':'当日任务','分岔路线':'分支流程','词汇':'词条','数织':'矩阵约束','挂机':'后台累计','扫雷':'节点排查','接线':'链路调整','熄灯':'状态归零','推箱子':'位置规划','关卡挑战':'分步任务'};
function launch(id){recent=[{id,at:Date.now()},...recent.filter(r=>r.id!==id)].slice(0,10);write('hgame-library-recent',recent);}
function render(){
 document.documentElement.dataset.view=quiet?'quiet':'standard';document.title=quiet?'本地工作空间 · HNova':'HGame · 本地游戏库';
 $('brand').innerHTML=quiet?'workspace.local <span>/ INDEX</span>':'H▧GAME <span>/ LIBRARY</span>';
 const texts=quiet?{view:'游戏视图',eyebrow:'LOCAL WORKSPACE / MODULE INDEX',subtitle:'按任务选择模块，随时切换上下文。',availableLabel:'个本地模块',noInstall:'统一运行入口',localLabel:'本地自动快照',collectionKicker:'MODULE DIRECTORY',collectionTitle:'工作空间',all:'全部',favorites:'常用',recent:'最近访问',noteTitle:'一个入口，切换不同工作空间。',noteText:'选择模块即可加载。模块内提供返回索引入口，操作记录保存在本机。',footerBrand:'HNova · 本地工作空间'}:{view:'工作台模式',eyebrow:'SMALL GAMES. YOUR OWN PACE.',subtitle:'各个小世界，随时开始。动点脑筋，或者放空一下。',availableLabel:'款本地游戏',noInstall:'无需逐个启动',localLabel:'进度保存在本机',collectionKicker:'THE COLLECTION',collectionTitle:'挑一个，开始吧',all:'全部',favorites:'收藏',recent:'最近打开',noteTitle:'只管挑，不用再管启动窗口。',noteText:'所有小游戏都在这里。进入任意游戏后，点「返回游戏库」就能换一个。',footerBrand:'HGame · 个人小游戏室'};
 for(const [id,value]of Object.entries(texts))$(id).textContent=value;
 $('subtitle').innerHTML=quiet?'按任务选择模块，<br>随时切换上下文。':'各个小世界，随时开始。<br>动点脑筋，或者放空一下。';
 $('title').innerHTML=quiet?'本地模块<br>运行索引。':'一点开，<br>玩一会。';$('view').setAttribute('aria-pressed',String(quiet));$('available').textContent=GAMES.length;$('endpoint').textContent=`${location.host} · ${quiet?'单进程运行时':'统一本地服务'}`;
 $('search').placeholder=quiet?'搜索模块、用途或编号':'搜索名称、玩法或编号';
 const selectedCategory=$('category').value;$('category').innerHTML=`<option value="all">${quiet?'全部用途':'全部分类'}</option>`+categories.map(c=>`<option value="${esc(c)}">${quiet?qcategory[c]:c}</option>`).join('');$('category').value=selectedCategory||'all';
 document.querySelectorAll('[data-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scope===scope)));
 const featured=GAMES.find(g=>g.id===recent[0]?.id)||GAMES[2];$('featured').href=gameUrl(featured.id,quiet);$('featured').dataset.launch=featured.id;$('featuredLabel').textContent=recent.length?(quiet?'恢复最近上下文':'继续上次的探索'):(quiet?'推荐工作空间':'从这里开始');$('featuredName').innerHTML=`${esc(quiet?featured.quiet:featured.name)} <span>↗</span>`;$('featuredDescription').textContent=quiet?featured.quietDescription:featured.description;$('featuredCTA').textContent=quiet?'加载模块 →':'打开游戏 →';document.querySelector('.art-code').textContent=quiet?`${featured.number} / ${featured.english.toUpperCase()}`:`${featured.number} / YOUR NEXT BREAK`;
 const query=$('search').value.trim().toLowerCase(),category=$('category').value;
 let games=GAMES.filter(g=>(category==='all'||category===g.category)&&(!query||[g.number,g.name,g.english,g.quiet,g.description,g.quietDescription,...g.tags].join(' ').toLowerCase().includes(query))&&(scope!=='favorites'||favorites.includes(g.id))&&(scope!=='recent'||recent.some(r=>r.id===g.id)));
 if(scope==='recent')games.sort((a,b)=>recent.findIndex(r=>r.id===a.id)-recent.findIndex(r=>r.id===b.id));
 $('resultCount').textContent=`${String(games.length).padStart(2,'0')} / ${String(GAMES.length).padStart(2,'0')}`;
 $('games').innerHTML=games.map(g=>`<article class="game-card" style="--card-color:${g.color}"><a class="card-main" href="${gameUrl(g.id,quiet)}" data-launch="${g.id}"><div class="card-art"><span class="card-number">${g.number}</span><b aria-hidden="true">${quiet?g.english.slice(0,2).toUpperCase():g.symbol}</b><span class="card-art-label">${esc(g.english.toUpperCase())}</span><span class="card-arrow">↗</span></div><div class="card-copy"><div class="card-title"><h3>${esc(quiet?g.quiet:g.name)}</h3><span>${quiet?qcategory[g.category]:g.category}</span></div><p>${esc(quiet?g.quietDescription:g.description)}</p><div class="tags">${g.tags.map(t=>`<span>${esc(quiet?qtags[t]||t:t)}</span>`).join('')}</div></div></a><div class="card-footer"><span>${esc(g.folder)}</span><button data-favorite="${g.id}" aria-label="${favorites.includes(g.id)?'取消':''}${quiet?'常用':'收藏'} ${esc(quiet?g.quiet:g.name)}" aria-pressed="${favorites.includes(g.id)}">${favorites.includes(g.id)?'★':'☆'}</button></div></article>`).join('');
 $('empty').hidden=games.length>0;$('emptyTitle').textContent=scope==='favorites'&&!query?(quiet?'暂无常用模块':'还没有收藏'):scope==='recent'&&!query?(quiet?'暂无访问记录':'还没有打开记录'):'没有找到匹配内容';$('emptyText').textContent=scope==='favorites'?(quiet?'点击模块卡片的星标，加入常用列表。':'点游戏卡片右下角的星标，把喜欢的留在这里。'):scope==='recent'?(quiet?'加载模块后，这里会显示最近的工作空间。':'打开游戏后，这里会保留最近玩过的游戏。'):'试试其他关键词，或重置分类筛选。';
 $('message').textContent=storageWarning?'浏览器存储不可用，本次收藏和最近记录无法保存。':'';
}
document.addEventListener('click',e=>{const link=e.target.closest('[data-launch]');if(link)launch(link.dataset.launch);const star=e.target.closest('[data-favorite]');if(star){const id=star.dataset.favorite;favorites=favorites.includes(id)?favorites.filter(v=>v!==id):[...favorites,id];write('hgame-library-favorites',favorites);render();document.querySelector(`[data-favorite="${id}"]`)?.focus();}});
document.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{scope=b.dataset.scope;render();});$('search').oninput=render;$('category').onchange=render;$('clear').onclick=()=>{scope='all';$('search').value='';$('category').value='all';render();};
function toggle(){quiet=!quiet;try{localStorage.setItem('hgame-library-view',quiet?'quiet':'standard');}catch{storageWarning=true;}render();}
$('view').onclick=toggle;document.addEventListener('keydown',e=>{if(e.altKey&&e.code==='KeyM'&&!e.repeat){e.preventDefault();toggle();}});
render();
