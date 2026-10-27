export const LENGTH=5,MAX_TRIES=6;
export const CATEGORIES={lang:'语言与语法',data:'数据结构',net:'网络与接口',sys:'进程与系统',db:'数据库',web:'工程与界面'};
export const WORDS=[
 {w:'class',c:'lang',n:'类'},{w:'while',c:'lang',n:'循环'},{w:'break',c:'lang',n:'跳出'},{w:'catch',c:'lang',n:'捕获'},{w:'throw',c:'lang',n:'抛出'},{w:'const',c:'lang',n:'常量'},{w:'async',c:'lang',n:'异步'},{w:'await',c:'lang',n:'等待'},{w:'yield',c:'lang',n:'让出'},{w:'super',c:'lang',n:'父类'},{w:'final',c:'lang',n:'终态'},{w:'float',c:'lang',n:'浮点数'},{w:'union',c:'lang',n:'联合体'},{w:'macro',c:'lang',n:'宏'},{w:'print',c:'lang',n:'打印'},{w:'input',c:'lang',n:'输入'},{w:'param',c:'lang',n:'参数'},{w:'local',c:'lang',n:'局部变量'},{w:'scope',c:'lang',n:'作用域'},{w:'token',c:'lang',n:'令牌'},{w:'parse',c:'lang',n:'解析'},{w:'panic',c:'lang',n:'崩溃'},{w:'abort',c:'lang',n:'中止'},{w:'spawn',c:'lang',n:'派生进程'},{w:'sleep',c:'lang',n:'休眠'},{w:'event',c:'lang',n:'事件'},{w:'state',c:'lang',n:'状态'},{w:'apply',c:'lang',n:'应用'},{w:'value',c:'lang',n:'值'},{w:'error',c:'lang',n:'错误'},{w:'debug',c:'lang',n:'调试'},{w:'trace',c:'lang',n:'追踪'},{w:'elsif',c:'lang',n:'分支'},{w:'endif',c:'lang',n:'结束分支'},
 {w:'array',c:'data',n:'数组'},{w:'queue',c:'data',n:'队列'},{w:'stack',c:'data',n:'栈'},{w:'graph',c:'data',n:'图'},{w:'tuple',c:'data',n:'元组'},{w:'index',c:'data',n:'索引'},{w:'cache',c:'data',n:'缓存'},{w:'bytes',c:'data',n:'字节'},{w:'nodes',c:'data',n:'节点'},{w:'edges',c:'data',n:'边'},{w:'deque',c:'data',n:'双端队列'},{w:'pivot',c:'data',n:'基准'},{w:'merge',c:'data',n:'合并'},{w:'patch',c:'data',n:'补丁'},{w:'clone',c:'data',n:'克隆'},{w:'chunk',c:'data',n:'分块'},{w:'tests',c:'data',n:'测试'},{w:'leaks',c:'data',n:'泄漏'},{w:'entry',c:'data',n:'入口'},{w:'logic',c:'data',n:'逻辑'},{w:'layer',c:'data',n:'层'},
 {w:'https',c:'net',n:'安全传输'},{w:'proxy',c:'net',n:'代理'},{w:'oauth',c:'net',n:'授权'},{w:'login',c:'net',n:'登录'},{w:'admin',c:'net',n:'管理'},{w:'fetch',c:'net',n:'抓取'},{w:'route',c:'net',n:'路由'},{w:'agent',c:'net',n:'客户端'},{w:'certs',c:'net',n:'证书'},{w:'nonce',c:'net',n:'一次性随机数'},{w:'retry',c:'net',n:'重试'},{w:'relay',c:'net',n:'中继'},{w:'ports',c:'net',n:'端口'},{w:'pings',c:'net',n:'探测'},{w:'cname',c:'net',n:'别名记录'},{w:'cloud',c:'net',n:'云'},
 {w:'query',c:'db',n:'查询'},{w:'table',c:'db',n:'表'},{w:'where',c:'db',n:'条件'},{w:'count',c:'db',n:'计数'},{w:'limit',c:'db',n:'上限'},{w:'order',c:'db',n:'排序'},{w:'group',c:'db',n:'分组'},{w:'mysql',c:'db',n:'数据库'},{w:'redis',c:'db',n:'缓存库'},{w:'alter',c:'db',n:'改表'},{w:'joins',c:'db',n:'连接'},{w:'dumps',c:'db',n:'导出'},
 {w:'shell',c:'sys',n:'终端'},{w:'mount',c:'sys',n:'挂载'},{w:'chmod',c:'sys',n:'权限'},{w:'chown',c:'sys',n:'属主'},{w:'inode',c:'sys',n:'索引节点'},{w:'linux',c:'sys',n:'系统'},{w:'stdin',c:'sys',n:'标准输入'},{w:'alias',c:'sys',n:'别名'},{w:'codec',c:'sys',n:'编解码'},{w:'octal',c:'sys',n:'八进制'},{w:'ascii',c:'sys',n:'字符集'},{w:'pixel',c:'sys',n:'像素'},{w:'color',c:'sys',n:'颜色'},{w:'alpha',c:'sys',n:'透明通道'},{w:'mutex',c:'sys',n:'互斥锁'},{w:'nginx',c:'sys',n:'服务器'},{w:'paths',c:'sys',n:'路径'},{w:'files',c:'sys',n:'文件'},{w:'links',c:'sys',n:'链接'},{w:'perms',c:'sys',n:'权限位'},{w:'users',c:'sys',n:'用户'},{w:'roles',c:'sys',n:'角色'},{w:'cores',c:'sys',n:'核心'},
 {w:'build',c:'web',n:'构建'},{w:'blame',c:'web',n:'追责'},{w:'stash',c:'web',n:'暂存'},{w:'hooks',c:'web',n:'钩子'},{w:'props',c:'web',n:'属性'},{w:'react',c:'web',n:'框架'},{w:'redux',c:'web',n:'状态库'},{w:'store',c:'web',n:'仓库'},{w:'click',c:'web',n:'点击'},{w:'focus',c:'web',n:'焦点'},{w:'hover',c:'web',n:'悬停'},{w:'modal',c:'web',n:'弹窗'},{w:'toast',c:'web',n:'提示条'},{w:'badge',c:'web',n:'徽标'},{w:'chart',c:'web',n:'图表'},{w:'valid',c:'web',n:'合法'},{w:'check',c:'web',n:'检查'},{w:'batch',c:'web',n:'批处理'},{w:'flush',c:'web',n:'刷写'},{w:'level',c:'web',n:'级别'},{w:'fatal',c:'web',n:'致命'},{w:'frame',c:'web',n:'帧'},{w:'guard',c:'web',n:'守卫'},{w:'proto',c:'web',n:'原型'},{w:'media',c:'web',n:'媒体查询'},{w:'width',c:'web',n:'宽度'},{w:'grids',c:'web',n:'网格'}];
export const WORD_INDEX=new Map(WORDS.map(item=>[item.w,item]));
export const ANSWERS=WORDS.map(item=>item.w);
export class RuleError extends Error{constructor(code){super(code);this.code=code;}}
export const isWord=value=>typeof value==='string'&&/^[a-z]{5}$/.test(value);
export const meta=word=>WORD_INDEX.get(word)||null;
export function evaluate(guess,answer){
 const marks=Array.from(guess,(ch,i)=>ch===answer[i]?'hit':'miss');
 const rest=[];
 for(let i=0;i<LENGTH;i++)if(marks[i]!=='hit')rest.push(answer[i]);
 for(let i=0;i<LENGTH;i++){
  if(marks[i]==='hit')continue;
  const at=rest.indexOf(guess[i]);
  if(at>=0){marks[i]='near';rest.splice(at,1);}
 }
 return marks;
}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function dayKey(ms=Date.now()){return new Date(ms+288e5).toISOString().slice(0,10).replaceAll('-','');}
export function dailyAnswer(date=dayKey()){return ANSWERS[hash(`WORDCHECK-${date}`)%ANSWERS.length];}
export function createGame({mode='practice',date=null,answer=null,random=Math.random,now=Date.now()}={}){
 const daily=mode==='daily',day=date||dayKey(now);
 const word=answer||(daily?dailyAnswer(day):ANSWERS[Math.floor(random()*ANSWERS.length)]);
 if(!isWord(word)||!WORD_INDEX.has(word))throw new RuleError('answer');
 return {version:1,id:crypto.randomUUID(),mode:daily?'daily':'practice',date:daily?day:null,answer:word,rows:[],status:'playing',startedAt:new Date(now).toISOString()};
}
export function submit(state,word){
 if(!state||state.status!=='playing')throw new RuleError('ended');
 if(!isWord(word))throw new RuleError('length');
 if(state.rows.some(row=>row.word===word))throw new RuleError('used');
 if(state.rows.length>=MAX_TRIES)throw new RuleError('exhausted');
 const marks=evaluate(word,state.answer);
 state.rows.push({word,marks});
 state.status=word===state.answer?'won':state.rows.length>=MAX_TRIES?'lost':'playing';
 return marks;
}
export function validSave(state){
 if(!state||state.version!==1||typeof state.id!=='string'||!state.id)return false;
 if(!['daily','practice'].includes(state.mode))return false;
 if(!WORD_INDEX.has(state.answer))return false;
 if(state.mode==='daily'?!/^\d{8}$/.test(state.date||''):state.date!==null)return false;
 if(!Array.isArray(state.rows)||state.rows.length>MAX_TRIES)return false;
 if(!['playing','won','lost'].includes(state.status))return false;
 if(!Number.isFinite(Date.parse(state.startedAt)))return false;
 for(const [i,row] of state.rows.entries()){
  if(!isWord(row.word)||!Array.isArray(row.marks)||row.marks.length!==LENGTH)return false;
  if(row.marks.some(mark=>!['hit','near','miss'].includes(mark)))return false;
  if(row.marks.join()!==evaluate(row.word,state.answer).join())return false;
  if(state.rows.slice(0,i).some(prev=>prev.word===row.word))return false;
  if(row.word===state.answer&&i!==state.rows.length-1)return false;
 }
 const hit=state.rows.some(row=>row.word===state.answer);
 if(hit!==(state.status==='won'))return false;
 if(state.status==='lost'&&state.rows.length!==MAX_TRIES)return false;
 if(state.status==='playing'&&state.rows.length>=MAX_TRIES)return false;
 return true;
}
export function recordResult(records,state,finishedAt=new Date().toISOString()){
 if(!state||state.status==='playing')return records;
 if(records.some(item=>item.id===state.id))return records;
 if(state.mode==='daily'&&records.some(item=>item.mode==='daily'&&item.date===state.date))return records;
 return [{id:state.id,date:state.date,mode:state.mode,word:state.answer,attempts:state.rows.length,won:state.status==='won',finishedAt},...records].slice(0,50);
}
export function validRecord(item){
 return Boolean(item)&&typeof item.id==='string'&&['daily','practice'].includes(item.mode)&&(item.mode==='daily'?/^\d{8}$/.test(item.date||''):item.date===null)&&WORD_INDEX.has(item.word)&&Number.isInteger(item.attempts)&&item.attempts>=1&&item.attempts<=MAX_TRIES&&typeof item.won==='boolean'&&Number.isFinite(Date.parse(item.finishedAt));
}
export function summarize(records){
 const done=records.length,wins=records.filter(item=>item.won).length;
 const dist=[1,2,3,4,5,6].map(tries=>records.filter(item=>item.won&&item.attempts===tries).length);
 let streak=0;
 for(const item of records){if(!item.won)break;streak++;}
 return {done,wins,rate:done?Math.round(wins*100/done):0,dist,streak};
}
