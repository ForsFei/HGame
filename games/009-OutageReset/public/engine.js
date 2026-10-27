export const LEVELS=[
 {id:'small',size:5,name:'小型',quiet:'范围 A',minMoves:3},
 {id:'medium',size:6,name:'中型',quiet:'范围 B',minMoves:4},
 {id:'large',size:7,name:'大型',quiet:'范围 C',minMoves:5}];
export class RuleError extends Error{constructor(code){super(code);this.code=code;}}
export function neighbours(index,size){
 const x=index%size,y=Math.floor(index/size),out=[];
 for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
  const nx=x+dx,ny=y+dy;
  if(nx>=0&&nx<size&&ny>=0&&ny<size)out.push(ny*size+nx);
 }
 return out;
}
function popcount(value){
 let count=0,n=value;
 while(n>0){count+=Number(n&1n);n>>=1n;}
 return count;
}
function countBits(value){
 let count=0,n=value;
 while(n){count+=n&1;n>>>=1;}
 return count;
}
export function toggleAt(lights,index,size){
 for(const spot of neighbours(index,size))lights[spot]=lights[spot]?0:1;
 return lights;
}
export function solve(lights,size){
 const total=size*size;
 if(!Array.isArray(lights)||lights.length!==total)return null;
 const rows=[];
 for(let index=0;index<total;index++){
  let row=0n;
  for(const spot of neighbours(index,size))row|=1n<<BigInt(spot);
  if(lights[index])row|=1n<<BigInt(total);
  rows.push(row);
 }
 const rhsShift=BigInt(total);
 const pivots=[];
 let rowIndex=0;
 for(let col=0;col<total&&rowIndex<total;col++){
  const bit=1n<<BigInt(col);
  let pivot=-1;
  for(let probe=rowIndex;probe<total;probe++)if(rows[probe]&bit){pivot=probe;break;}
  if(pivot<0)continue;
  const swap=rows[rowIndex];rows[rowIndex]=rows[pivot];rows[pivot]=swap;
  for(let spot=0;spot<total;spot++)if(spot!==rowIndex&&(rows[spot]&bit))rows[spot]^=rows[rowIndex];
  pivots.push(col);
  rowIndex++;
 }
 for(let spot=rowIndex;spot<total;spot++)if(rows[spot]===1n<<rhsShift)return null;
 const pivotSet=new Set(pivots);
 const freeCols=[];
 for(let col=0;col<total;col++)if(!pivotSet.has(col))freeCols.push(col);
 const freeCount=freeCols.length;
 if(freeCount>20)return null;
 const freeOfRow=[];
 for(let spot=0;spot<pivots.length;spot++){
  let bits=0;
  for(let slot=0;slot<freeCount;slot++)if((rows[spot]>>BigInt(freeCols[slot]))&1n)bits|=1<<slot;
  freeOfRow.push({bits,rhs:(rows[spot]>>rhsShift)&1n});
 }
 let best=null,bestWeight=Infinity;
 const weights=[];
 for(let mask=0;mask<(1<<freeCount);mask++)weights[mask]=countBits(mask);
 for(let mask=0;mask<(1<<freeCount);mask++){
  if(weights[mask]>=bestWeight)continue;
  let pressed=0n,weight=weights[mask];
  for(let spot=0;spot<pivots.length;spot++){
   const info=freeOfRow[spot];
   const parity=countBits(mask&info.bits)&1;
   const value=info.rhs^BigInt(parity);
   if(value){pressed|=1n<<BigInt(pivots[spot]);weight++;}
  }
  if(weight>=bestWeight)continue;
  bestWeight=weight;
  const presses=[];
  for(let slot=0;slot<freeCount;slot++)if((mask>>slot)&1)presses.push(freeCols[slot]);
  for(let spot=0;spot<pivots.length;spot++){
   if((pressed>>BigInt(pivots[spot]))&1n)presses.push(pivots[spot]);
  }
  presses.sort((a,b)=>a-b);
  best={moves:weight,presses};
 }
 return best;
}
export function minimumMoves(lights,size){
 const result=solve(lights,size);
 return result?result.moves:null;
}
export function solved(lights,size){
 return Array.isArray(lights)&&lights.length===size*size&&lights.every(value=>value===0);
}
export function litCount(lights){return lights.filter(Boolean).length;}
export function generate(size,random=Math.random,minMoves=3,attempts=80){
 const total=size*size;
 let last=null;
 for(let attempt=0;attempt<attempts;attempt++){
  const lights=new Array(total).fill(0);
  const presses=minMoves+Math.floor(random()*Math.max(1,size-1));
  const chosen=new Set();
  for(let step=0;step<presses;step++)chosen.add(Math.floor(random()*total));
  for(const index of chosen)toggleAt(lights,index,size);
  const optimal=minimumMoves(lights,size);
  last={lights,optimal};
  if(optimal===null||optimal<minMoves)continue;
  if(optimal>chosen.size)continue;
  return {lights,optimal};
 }
 return last;
}
export function levelOf(size){return LEVELS.find(level=>level.size===size)||null;}
export function createGame(level,{now=Date.now(),random=Math.random}={}){
 const {lights,optimal}=generate(level.size,random,level.minMoves);
 return {version:1,id:crypto.randomUUID(),size:level.size,level:level.id,lights,initial:[...lights],moves:0,optimal,status:'ready',startedAt:new Date(now).toISOString(),finishedAt:null};
}
export function press(state,index){
 if(state.status==='won')throw new RuleError('ended');
 if(!Number.isInteger(index)||index<0||index>=state.size*state.size)throw new RuleError('index');
 toggleAt(state.lights,index,state.size);
 if(state.status==='ready'){
  state.status='playing';
  state.startedAt=new Date().toISOString();
 }
 state.moves+=1;
 if(solved(state.lights,state.size)){
  state.status='won';
  state.finishedAt=new Date().toISOString();
 }
 return true;
}
export function restart(state,{now=Date.now()}={}){
 state.lights=[...state.initial];
 state.moves=0;
 state.status='ready';
 state.startedAt=new Date(now).toISOString();
 state.finishedAt=null;
 return state;
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
 for(const key of ['lights','initial'])if(!Array.isArray(state[key])||state[key].length!==total)return false;
 for(const key of ['lights','initial'])if(state[key].some(value=>value!==0&&value!==1))return false;
 if(!Number.isInteger(state.moves)||state.moves<0)return false;
 if(!Number.isInteger(state.optimal)||state.optimal<0)return false;
 if(!['ready','playing','won'].includes(state.status))return false;
 if(!Number.isFinite(Date.parse(state.startedAt)))return false;
 if(state.status==='ready'){
  return state.moves===0&&state.finishedAt===null&&state.lights.every((value,index)=>value===state.initial[index]);
 }
 if(state.moves<1)return false;
 if(state.status==='playing')return state.finishedAt===null&&!solved(state.lights,state.size);
 if(!Number.isFinite(Date.parse(state.finishedAt||'')))return false;
 return solved(state.lights,state.size);
}
export function recordResult(records,state,finishedAt=new Date().toISOString()){
 if(!state||state.status!=='won')return records;
 if(records.some(item=>item.id===state.id))return records;
 return [{id:state.id,level:state.level,size:state.size,seconds:elapsedSeconds(state,Date.parse(finishedAt)),moves:state.moves,optimal:state.optimal,finishedAt},...records].slice(0,50);
}
export function validRecord(item){
 return Boolean(item)&&typeof item.id==='string'&&LEVELS.some(level=>level.id===item.level&&level.size===item.size)&&Number.isFinite(item.seconds)&&item.seconds>=0&&Number.isInteger(item.moves)&&item.moves>=1&&Number.isInteger(item.optimal)&&item.optimal>=1&&Number.isFinite(Date.parse(item.finishedAt));
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
