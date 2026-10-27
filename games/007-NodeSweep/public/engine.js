export const LEVELS=[
 {id:'small',size:9,mines:10,name:'小型',quiet:'范围 A'},
 {id:'medium',size:13,mines:28,name:'中型',quiet:'范围 B'},
 {id:'large',size:16,mines:50,name:'大型',quiet:'范围 C'}];
export class RuleError extends Error{constructor(code){super(code);this.code=code;}}
export function neighbours(index,size){
 const x=index%size,y=Math.floor(index/size),out=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  if(!dx&&!dy)continue;
  const nx=x+dx,ny=y+dy;
  if(nx>=0&&nx<size&&ny>=0&&ny<size)out.push(ny*size+nx);
 }
 return out;
}
export function cluesOf(mine,size){
 return mine.map((isMine,index)=>isMine?-1:neighbours(index,size).filter(spot=>mine[spot]).length);
}
function flood(known,mine,clues,start,size){
 const stack=[start];
 while(stack.length){
  const index=stack.pop();
  if(clues[index]!==0)continue;
  for(const spot of neighbours(index,size)){
   if(known[spot]||mine[spot])continue;
   known[spot]=true;
   stack.push(spot);
  }
 }
}
export function solvable(mine,size,first){
 const total=size*size,clues=cluesOf(mine,size);
 const known=new Array(total).fill(false),flagged=new Array(total).fill(false);
 known[first]=true;
 flood(known,mine,clues,first,size);
 let changed=true;
 while(changed){
  changed=false;
  for(let index=0;index<total;index++){
   if(!known[index]||clues[index]<=0)continue;
   const nearby=neighbours(index,size);
   const unknown=[];
   let flags=0;
   for(const spot of nearby){
    if(flagged[spot])flags++;
    else if(!known[spot])unknown.push(spot);
   }
   if(!unknown.length)continue;
   const left=clues[index]-flags;
   if(left===0){
    for(const spot of unknown){
     if(mine[spot])return false;
     known[spot]=true;
     changed=true;
    }
    for(const spot of unknown)flood(known,mine,clues,spot,size);
   }else if(left===unknown.length){
    for(const spot of unknown){flagged[spot]=true;changed=true;}
   }
  }
 }
 for(let index=0;index<total;index++)if(!mine[index]&&!known[index])return false;
 return true;
}
function layout(size,mines,first,random){
 const total=size*size;
 const banned=new Set([first,...neighbours(first,size)]);
 const pool=[];
 for(let index=0;index<total;index++)if(!banned.has(index))pool.push(index);
 if(pool.length<mines){
  pool.length=0;
  for(let index=0;index<total;index++)if(index!==first)pool.push(index);
 }
 for(let i=0;i<mines;i++){
  const j=i+Math.floor(random()*(pool.length-i));
  const swap=pool[i];pool[i]=pool[j];pool[j]=swap;
 }
 const mine=new Array(total).fill(false);
 for(let i=0;i<mines;i++)mine[pool[i]]=true;
 return mine;
}
export function generate(size,mines,first,random=Math.random,attempts=400){
 let last=null;
 for(let attempt=0;attempt<attempts;attempt++){
  const mine=layout(size,mines,first,random);
  last=mine;
  if(solvable(mine,size,first))return {mine,solvable:true,attempts:attempt+1};
 }
 return {mine:last,solvable:false,attempts};
}
export function levelOf(size){return LEVELS.find(level=>level.size===size)||null;}
export function createGame(level,{now=Date.now(),daily=null}={}){
 const total=level.size*level.size;
 return {version:1,id:crypto.randomUUID(),size:level.size,mines:level.mines,level:level.id,daily,mine:new Array(total).fill(false),open:new Array(total).fill(false),flag:new Array(total).fill(false),status:'ready',startedAt:new Date(now).toISOString(),finishedAt:null,firstIndex:null};
}
export function flagsLeft(state){return state.mines-state.flag.filter(Boolean).length;}
export function openedCount(state){return state.open.filter(Boolean).length;}
export function checkWin(state){
 for(let index=0;index<state.mine.length;index++)if(!state.mine[index]&&!state.open[index])return false;
 return true;
}
export function reveal(state,index,random=Math.random){
 if(state.status==='won'||state.status==='lost')throw new RuleError('ended');
 if(!Number.isInteger(index)||index<0||index>=state.size*state.size)throw new RuleError('index');
 if(state.flag[index]||state.open[index])return {opened:0,exploded:false};
 if(state.status==='ready'){
  const result=generate(state.size,state.mines,index,random);
  state.mine=result.mine;
  state.status='playing';
  state.startedAt=new Date().toISOString();
  state.firstIndex=index;
 }
 const clues=cluesOf(state.mine,state.size);
 if(state.mine[index]){
  state.open[index]=true;
  state.status='lost';
  state.finishedAt=new Date().toISOString();
  for(let spot=0;spot<state.mine.length;spot++)if(state.mine[spot])state.open[spot]=true;
  return {opened:1,exploded:true};
 }
 let opened=0;
 const stack=[index];
 while(stack.length){
  const spot=stack.pop();
  if(state.open[spot]||state.mine[spot]||state.flag[spot])continue;
  state.open[spot]=true;
  opened++;
  if(clues[spot]===0)for(const next of neighbours(spot,state.size))if(!state.open[next]&&!state.flag[next])stack.push(next);
 }
 if(checkWin(state)){state.status='won';state.finishedAt=new Date().toISOString();}
 return {opened,exploded:false};
}
export function toggleFlag(state,index){
 if(state.status==='won'||state.status==='lost')throw new RuleError('ended');
 if(!Number.isInteger(index)||index<0||index>=state.size*state.size)throw new RuleError('index');
 if(state.open[index])return false;
 state.flag[index]=!state.flag[index];
 return state.flag[index];
}
export function elapsedSeconds(state,now=Date.now()){
 if(state.status==='ready')return 0;
 const end=state.finishedAt?Date.parse(state.finishedAt):now;
 return Math.max(0,Math.round((end-Date.parse(state.startedAt))/1000));
}
export function validSave(state){
 if(!state||state.version!==1||typeof state.id!=='string'||!state.id)return false;
 const level=levelOf(state.size);
 if(!level||state.mines!==level.mines||state.level!==level.id)return false;
 if(state.daily!==undefined&&state.daily!==null&&!(typeof state.daily==='string'&&/^\d{8}$/.test(state.daily)))return false;
 const total=state.size*state.size;
 for(const key of ['mine','open','flag'])if(!Array.isArray(state[key])||state[key].length!==total)return false;
 if(state.mine.some(value=>typeof value!=='boolean'))return false;
 if(state.open.some(value=>typeof value!=='boolean'))return false;
 if(state.flag.some(value=>typeof value!=='boolean'))return false;
 for(let index=0;index<total;index++)if(state.open[index]&&state.flag[index])return false;
 if(!['ready','playing','won','lost'].includes(state.status))return false;
 if(!Number.isFinite(Date.parse(state.startedAt)))return false;
 if(state.status==='ready')return !state.open.some(Boolean)&&!state.mine.some(Boolean)&&!state.flag.some(Boolean)&&state.firstIndex===null;
 if(state.mine.filter(Boolean).length!==state.mines)return false;
 if(!Number.isInteger(state.firstIndex)||state.firstIndex<0||state.firstIndex>=total)return false;
 if(state.status==='playing'?(state.finishedAt!==null):!Number.isFinite(Date.parse(state.finishedAt||'')))return false;
 if(state.status==='won'&&!checkWin(state))return false;
 if(state.status==='lost'&&!state.mine.some((isMine,index)=>isMine&&state.open[index]))return false;
 if(state.status==='playing'&&state.mine.some((isMine,index)=>isMine&&state.open[index]))return false;
 return true;
}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function dayKey(ms=Date.now()){return new Date(ms+288e5).toISOString().slice(0,10).replaceAll('-','');}
export function pickDailyLevel(date=dayKey()){return LEVELS[hash(`NODESWEEP-${date}`)%LEVELS.length];}
export function recordResult(records,state,finishedAt=new Date().toISOString()){
 if(!state||state.status!=='won')return records;
 if(records.some(item=>item.id===state.id))return records;
 return [{id:state.id,level:state.level,size:state.size,seconds:elapsedSeconds(state,Date.parse(finishedAt)),finishedAt},...records].slice(0,50);
}
export function validRecord(item){
 return Boolean(item)&&typeof item.id==='string'&&LEVELS.some(level=>level.id===item.level&&level.size===item.size)&&Number.isFinite(item.seconds)&&item.seconds>=0&&Number.isFinite(Date.parse(item.finishedAt));
}
const DAY=/^\d{8}$/;
export function validDailyRecord(item){
 return Boolean(item)&&typeof item.date==='string'&&DAY.test(item.date)&&LEVELS.some(level=>level.id===item.level&&level.size===item.size)&&Number.isFinite(item.seconds)&&item.seconds>=0&&Number.isFinite(Date.parse(item.finishedAt));
}
export function recordDaily(list,state,finishedAt=new Date().toISOString()){
 if(!state||state.status!=='won'||typeof state.daily!=='string'||!DAY.test(state.daily))return list;
 const entry={date:state.daily,level:state.level,size:state.size,seconds:elapsedSeconds(state,Date.parse(finishedAt)),finishedAt};
 const previous=list.find(item=>item.date===entry.date);
 const best=previous&&previous.seconds<=entry.seconds?previous:entry;
 return [best,...list.filter(item=>item.date!==entry.date)].slice(0,30);
}
export function dailyBest(list,date=dayKey()){
 const item=list.find(entry=>entry.date===date);
 return item&&validDailyRecord(item)?item:null;
}
export function summarize(records){
 const byLevel={};
 for(const level of LEVELS)byLevel[level.id]=records.filter(item=>item.level===level.id);
 return {done:records.length,best:byLevel,bestTime:Object.fromEntries(LEVELS.map(level=>[level.id,byLevel[level.id].length?Math.min(...byLevel[level.id].map(item=>item.seconds)):null]))};
}
