export const LEVELS=[
 {id:'small',size:6,name:'小型',quiet:'范围 A'},
 {id:'medium',size:7,name:'中型',quiet:'范围 B'},
 {id:'large',size:8,name:'大型',quiet:'范围 C'}];
export class RuleError extends Error{constructor(code){super(code);this.code=code;}}
const STEPS=[[0,-1],[1,0],[0,1],[-1,0]];
export function step(index,dir,size){
 const x=index%size,y=Math.floor(index/size),s=STEPS[dir];
 const nx=x+s[0],ny=y+s[1];
 return nx<0||nx>=size||ny<0||ny>=size?-1:ny*size+nx;
}
export function rotate(mask,turns=1){
 let out=mask&15;
 const n=((turns%4)+4)%4;
 for(let i=0;i<n;i++)out=((out<<1)|(out>>3))&15;
 return out;
}
export function bends(mask){return (mask&1)+(mask&2?1:0)+(mask&4?1:0)+(mask&8?1:0);}
export function openEnds(tiles,size){
 let ends=0;
 for(let index=0;index<tiles.length;index++){
  for(let dir=0;dir<4;dir++){
   if(!(tiles[index]&(1<<dir)))continue;
   const near=step(index,dir,size);
   if(near<0||!(tiles[near]&(1<<((dir+2)%4))))ends++;
  }
 }
 return ends;
}
export function reach(tiles,size,start=0){
 const seen=new Array(size*size).fill(false);
 if(!Number.isInteger(start)||start<0||start>=tiles.length)return seen;
 seen[start]=true;
 const queue=[start];
 while(queue.length){
  const cur=queue.pop();
  for(let dir=0;dir<4;dir++){
   if(!(tiles[cur]&(1<<dir)))continue;
   const near=step(cur,dir,size);
   if(near<0||seen[near]||!(tiles[near]&(1<<((dir+2)%4))))continue;
   seen[near]=true;queue.push(near);
  }
 }
 return seen;
}
export function solved(tiles,size){
 if(!Array.isArray(tiles)||tiles.length!==size*size)return false;
 if(tiles.some(mask=>!Number.isInteger(mask)||mask<0||mask>15))return false;
 if(openEnds(tiles,size))return false;
 return reach(tiles,size,0).every(Boolean);
}
export function generate(size,random=Math.random){
 const total=size*size;
 const seen=new Array(total).fill(false);
 const solution=new Array(total).fill(0);
 const stack=[0];
 seen[0]=true;
 while(stack.length){
  const cur=stack[stack.length-1];
  const options=[];
  for(let dir=0;dir<4;dir++){
   const near=step(cur,dir,size);
   if(near>=0&&!seen[near])options.push([dir,near]);
  }
  if(!options.length){stack.pop();continue;}
  const [dir,near]=options[Math.floor(random()*options.length)];
  solution[cur]|=1<<dir;
  solution[near]|=1<<((dir+2)%4);
  seen[near]=true;
  stack.push(near);
 }
 const locked=new Array(total).fill(false);
 locked[0]=true;
 locked[total-1]=true;
 const tiles=solution.map((mask,index)=>locked[index]?mask:rotate(mask,1+Math.floor(random()*3)));
 if(solved(tiles,size)){
  const index=tiles.findIndex((mask,spot)=>!locked[spot]);
  if(index>=0)tiles[index]=rotate(tiles[index],1);
 }
 return {tiles,solution,locked};
}
export function levelOf(size){return LEVELS.find(level=>level.size===size)||null;}
export function createGame(level,{now=Date.now(),random=Math.random}={}){
 const {tiles,locked}=generate(level.size,random);
 return {version:1,id:crypto.randomUUID(),size:level.size,level:level.id,tiles,locked,status:'ready',moves:0,startedAt:new Date(now).toISOString(),finishedAt:null};
}
export function turn(state,index,direction=1){
 if(state.status==='won')throw new RuleError('ended');
 if(!Number.isInteger(index)||index<0||index>=state.size*state.size)throw new RuleError('index');
 if(state.locked[index])return false;
 state.tiles[index]=rotate(state.tiles[index],direction);
 if(state.status==='ready'){
  state.status='playing';
  state.startedAt=new Date().toISOString();
 }
 state.moves+=1;
 if(solved(state.tiles,state.size)){
  state.status='won';
  state.finishedAt=new Date().toISOString();
 }
 return true;
}
export function liveCount(state){
 return reach(state.tiles,state.size,0).filter(Boolean).length;
}
export function elapsedSeconds(state,now=Date.now()){
 if(state.status==='ready')return 0;
 const end=state.finishedAt?Date.parse(state.finishedAt):now;
 return Math.max(0,Math.round((end-Date.parse(state.startedAt))/1000));
}
export function validSave(state){
 if(!state||state.version!==1||typeof state.id!=='string'||!state.id)return false;
 const level=levelOf(state.size);
 if(!level||state.level!==level.id)return false;
 const total=state.size*state.size;
 for(const key of ['tiles','locked'])if(!Array.isArray(state[key])||state[key].length!==total)return false;
 if(state.tiles.some(mask=>!Number.isInteger(mask)||mask<0||mask>15))return false;
 if(state.locked.some(value=>typeof value!=='boolean'))return false;
 if(!Number.isInteger(state.moves)||state.moves<0)return false;
 if(!['ready','playing','won'].includes(state.status))return false;
 if(!Number.isFinite(Date.parse(state.startedAt)))return false;
 if(state.status==='ready')return state.moves===0&&state.finishedAt===null;
 if(!Number.isInteger(state.moves)||state.moves<1)return false;
 if(state.status==='playing')return state.finishedAt===null&&!solved(state.tiles,state.size);
 if(!Number.isFinite(Date.parse(state.finishedAt||'')))return false;
 return solved(state.tiles,state.size);
}
export function recordResult(records,state,finishedAt=new Date().toISOString()){
 if(!state||state.status!=='won')return records;
 if(records.some(item=>item.id===state.id))return records;
 return [{id:state.id,level:state.level,size:state.size,seconds:elapsedSeconds(state,Date.parse(finishedAt)),moves:state.moves,finishedAt},...records].slice(0,50);
}
export function validRecord(item){
 return Boolean(item)&&typeof item.id==='string'&&LEVELS.some(level=>level.id===item.level&&level.size===item.size)&&Number.isFinite(item.seconds)&&item.seconds>=0&&Number.isInteger(item.moves)&&item.moves>=1&&Number.isFinite(Date.parse(item.finishedAt));
}
export function summarize(records){
 const byLevel={};
 for(const level of LEVELS)byLevel[level.id]=records.filter(item=>item.level===level.id);
 return {
  done:records.length,
  best:byLevel,
  bestTime:Object.fromEntries(LEVELS.map(level=>[level.id,byLevel[level.id].length?Math.min(...byLevel[level.id].map(item=>item.seconds)):null])),
  bestMoves:Object.fromEntries(LEVELS.map(level=>[level.id,byLevel[level.id].length?Math.min(...byLevel[level.id].map(item=>item.moves)):null])),
 };
}
