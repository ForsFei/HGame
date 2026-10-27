export const EMPTY=0,FILLED=1,MARKED=2;
export const SIZES=[5,10,15];
export function cluesOf(line){
 const out=[];let run=0;
 for(const value of line){if(value)run++;else if(run){out.push(run);run=0;}}
 if(run)out.push(run);
 return out;
}
export function gridOf(puzzle){return puzzle.solution.map(row=>[...row].map(ch=>ch==='1'?1:0));}
export function puzzleClues(puzzle){
 const grid=gridOf(puzzle);
 return {rows:grid.map(cluesOf),cols:Array.from({length:puzzle.size},(_,c)=>cluesOf(grid.map(row=>row[c])))};
}
export function lineCandidates(clue,size){
 const result=[];
 const build=(index,start,row)=>{
  if(index===clue.length){result.push([...row]);return;}
  const rest=clue.slice(index).reduce((sum,value)=>sum+value,0)+clue.length-index-1;
  for(let at=start;at<=size-rest;at++){
   const next=[...row];
   for(let k=0;k<clue[index];k++)next[at+k]=1;
   build(index+1,at+clue[index]+1,next);
  }
 };
 build(0,0,Array(size).fill(0));
 return result;
}
export function countSolutions(rowClues,colClues,size,limit=2){
 const rows=rowClues.map(clue=>lineCandidates(clue,size));
 if(rows.some(list=>list.length===0))return 0;
 let count=0;
 const walk=(r,states)=>{
  if(count>=limit)return;
  if(r===size){
   for(let c=0;c<size;c++){
    const state=states[c],blocks=colClues[c];
    const done=state.run===0?state.bi===blocks.length:state.bi===blocks.length-1&&state.run===blocks[state.bi];
    if(!done)return;
   }
   count++;return;
  }
  for(const row of rows[r]){
   const next=new Array(size);
   let ok=true;
   for(let c=0;c<size;c++){
    const state=states[c],blocks=colClues[c];
    if(row[c]){
     if(state.bi>=blocks.length||state.run+1>blocks[state.bi]){ok=false;break;}
     next[c]={bi:state.bi,run:state.run+1};
    }else if(state.run){
     if(state.run!==blocks[state.bi]){ok=false;break;}
     next[c]={bi:state.bi+1,run:0};
    }else next[c]=state;
   }
   if(!ok)continue;
   walk(r+1,next);
   if(count>=limit)return;
  }
 };
 walk(0,Array.from({length:size},()=>({bi:0,run:0})));
 return count;
}
export function validPuzzle(puzzle){
 if(!puzzle||!SIZES.includes(puzzle.size))return false;
 if(typeof puzzle.id!=='string'||!puzzle.id)return false;
 if(!Array.isArray(puzzle.solution)||puzzle.solution.length!==puzzle.size)return false;
 let filled=0;
 for(const row of puzzle.solution){
  if(typeof row!=='string'||row.length!==puzzle.size||!/^[01]+$/.test(row))return false;
  filled+=row.split('').filter(ch=>ch==='1').length;
 }
 return filled>0&&filled<puzzle.size*puzzle.size;
}
export function isUnique(puzzle){
 if(!validPuzzle(puzzle))return false;
 const {rows,cols}=puzzleClues(puzzle);
 return countSolutions(rows,cols,puzzle.size,2)===1;
}
export function createGame(puzzle,{mode='practice',date=null,now=Date.now()}={}){
 if(!validPuzzle(puzzle))throw new Error('puzzle');
 return {version:1,id:crypto.randomUUID(),puzzleId:puzzle.id,size:puzzle.size,mode:mode==='daily'?'daily':'practice',date:mode==='daily'?date:null,solution:[...puzzle.solution],marks:Array(puzzle.size*puzzle.size).fill(EMPTY),status:'playing',startedAt:new Date(now).toISOString()};
}
export function target(state,index){
 const row=state.solution[Math.floor(index/state.size)];
 return row[index%state.size]==='1'?FILLED:EMPTY;
}
export function setMark(state,index,value){
 if(state.status!=='playing')throw new Error('ended');
 if(!Number.isInteger(index)||index<0||index>=state.marks.length)throw new Error('index');
 if(![EMPTY,FILLED,MARKED].includes(value))throw new Error('value');
 state.marks[index]=value;
 if(isSolved(state)){state.status='won';state.finishedAt=new Date().toISOString();}
 return state.marks[index];
}
export function cycle(state,index){
 const next={[EMPTY]:FILLED,[FILLED]:MARKED,[MARKED]:EMPTY}[state.marks[index]];
 return setMark(state,index,next);
}
export function isSolved(state){
 for(let i=0;i<state.marks.length;i++)if((state.marks[i]===FILLED?FILLED:EMPTY)!==target(state,i))return false;
 return true;
}
export function mistakes(state){
 const list=[];
 for(let i=0;i<state.marks.length;i++)if(state.marks[i]===FILLED&&target(state,i)!==FILLED)list.push(i);
 return list;
}
export function filledCount(state){return state.marks.filter(mark=>mark===FILLED).length;}
export function rowDone(state,row){
 const want=cluesOf([...state.solution[row]].map(ch=>ch==='1'?1:0)).join();
 const got=cluesOf(Array.from({length:state.size},(_,c)=>state.marks[row*state.size+c]===FILLED?1:0)).join();
 return want===got;
}
export function colDone(state,col){
 const want=cluesOf(Array.from({length:state.size},(_,r)=>state.solution[r][col]==='1'?1:0)).join();
 const got=cluesOf(Array.from({length:state.size},(_,r)=>state.marks[r*state.size+col]===FILLED?1:0)).join();
 return want===got;
}
export function validSave(state){
 if(!state||state.version!==1||typeof state.id!=='string'||!state.id)return false;
 if(!SIZES.includes(state.size))return false;
 if(!['daily','practice'].includes(state.mode))return false;
 if(state.mode==='daily'?!/^\d{8}$/.test(state.date||''):state.date!==null)return false;
 if(!Array.isArray(state.solution)||state.solution.length!==state.size)return false;
 let filled=0;
 for(const row of state.solution){
  if(typeof row!=='string'||row.length!==state.size||!/^[01]+$/.test(row))return false;
  filled+=row.split('').filter(ch=>ch==='1').length;
 }
 if(filled===0||filled===state.size*state.size)return false;
 if(!Array.isArray(state.marks)||state.marks.length!==state.size*state.size)return false;
 if(state.marks.some(mark=>![EMPTY,FILLED,MARKED].includes(mark)))return false;
 if(!['playing','won'].includes(state.status))return false;
 if(!Number.isFinite(Date.parse(state.startedAt)))return false;
 if((state.status==='won')!==isSolved(state))return false;
 return true;
}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function dayKey(ms=Date.now()){return new Date(ms+288e5).toISOString().slice(0,10).replaceAll('-','');}
export function pickDaily(puzzles,date=dayKey()){
 const pool=puzzles.filter(puzzle=>puzzle.size===10);
 const list=pool.length?pool:puzzles;
 return list[hash(`PIXELWEAVE-${date}`)%list.length];
}
export function pickPractice(puzzles,size,random=Math.random,excludeId=null){
 const pool=puzzles.filter(puzzle=>puzzle.size===size&&puzzle.id!==excludeId);
 const list=pool.length?pool:puzzles.filter(puzzle=>puzzle.size===size);
 return list[Math.floor(random()*list.length)];
}
export function recordResult(records,state,finishedAt=new Date().toISOString()){
 if(!state||state.status!=='won')return records;
 if(records.some(item=>item.id===state.id))return records;
 if(state.mode==='daily'&&records.some(item=>item.mode==='daily'&&item.date===state.date))return records;
 return [{id:state.id,puzzleId:state.puzzleId,size:state.size,mode:state.mode,date:state.date,finishedAt},...records].slice(0,50);
}
export function validRecord(item){
 return Boolean(item)&&typeof item.id==='string'&&typeof item.puzzleId==='string'&&SIZES.includes(item.size)&&['daily','practice'].includes(item.mode)&&(item.mode==='daily'?/^\d{8}$/.test(item.date||''):item.date===null)&&Number.isFinite(Date.parse(item.finishedAt));
}
export function summarize(records){
 const bySize={5:0,10:0,15:0};
 for(const item of records)if(bySize[item.size]!==undefined)bySize[item.size]++;
 return {done:records.length,daily:records.filter(item=>item.mode==='daily').length,bySize};
}
