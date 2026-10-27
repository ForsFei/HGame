export const LEVELS=[
 {id:'l1',name:'第 1 关',quiet:'仓位 1',par:2,rows:['#######','#     #','# .# *#','# $   #','#@    #','#   ###','#######']},
 {id:'l2',name:'第 2 关',quiet:'仓位 2',par:3,rows:['#######','#@$.  #','#$##  #','#.  # #','# *   #','#*#   #','#######']},
 {id:'l3',name:'第 3 关',quiet:'仓位 3',par:4,rows:['#######','#@$. ##','#$# *##','#     #','#.#   #','# ##* #','#######']},
 {id:'l4',name:'第 4 关',quiet:'仓位 4',par:5,rows:['########','# *   .#','#    $ #','#     *#','#*   @ #','#      #','#     ##','########']},
 {id:'l5',name:'第 5 关',quiet:'仓位 5',par:7,rows:['#######','#     #','## $..#','#*   $#','# ##@ #','##   ##','#######']},
 {id:'l6',name:'第 6 关',quiet:'仓位 6',par:10,rows:['########','##  ## #','#  # ###','# #   ##','#@  $ ##','# #.## #','########']},
 {id:'l7',name:'第 7 关',quiet:'仓位 7',par:12,rows:['#######','##    #','#@    #','#.   .#','#$  #$#','#     #','#######']},
 {id:'l8',name:'第 8 关',quiet:'仓位 8',par:17,rows:['########','#      #','##    $#','# .   .#','#@$$.  #','##  #  #','#*     #','########']},
];
export class RuleError extends Error{constructor(code){super(code);this.code=code;}}
export function levelById(id){return LEVELS.find(level=>level.id===id)||null;}
export function parse(level){
 const rows=level.rows;
 const height=rows.length,width=Math.max(...rows.map(row=>row.length));
 const walls=[],goals=[],boxes=[];
 let player=-1;
 for(let y=0;y<height;y++){
  for(let x=0;x<width;x++){
   const ch=rows[y][x]||' ';
   const index=y*width+x;
   if(ch==='#')walls.push(index);
   else if(ch==='.')goals.push(index);
   else if(ch==='$')boxes.push(index);
   else if(ch==='*'){goals.push(index);boxes.push(index);}
   else if(ch==='@')player=index;
   else if(ch==='+'){goals.push(index);player=index;}
  }
 }
 return {width,height,walls,goals,boxes,player};
}
export function createGame(level,{now=Date.now()}={}){
 const board=parse(level);
 return {version:1,id:crypto.randomUUID(),level:level.id,w:board.width,h:board.height,walls:board.walls,goals:board.goals,boxes:[...board.boxes],player:board.player,par:level.par||0,moves:0,pushes:0,status:'ready',startedAt:new Date(now).toISOString(),finishedAt:null,history:[],start:{boxes:[...board.boxes],player:board.player}};
}
export function solved(state){
 return state.boxes.every(box=>state.goals.includes(box));
}
export function boxOnGoal(state,box){return state.goals.includes(box);}
export function move(state,dx,dy){
 if(state.status==='won')throw new RuleError('ended');
 if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)throw new RuleError('dir');
 const from=state.player,x=from%state.w,y=Math.floor(from/state.w);
 const nx=x+dx,ny=y+dy;
 if(nx<0||nx>=state.w||ny<0||ny>=state.h)return {moved:false,pushed:false};
 const to=ny*state.w+nx;
 if(state.walls.includes(to))return {moved:false,pushed:false};
 const slot=state.boxes.indexOf(to);
 let pushed=false;
 if(slot>=0){
  const bx=nx+dx,by=ny+dy;
  if(bx<0||bx>=state.w||by<0||by>=state.h)return {moved:false,pushed:false};
  const beyond=by*state.w+bx;
  if(state.walls.includes(beyond)||state.boxes.includes(beyond))return {moved:false,pushed:false};
  state.boxes[slot]=beyond;
  state.history.push({from,to,slot,boxFrom:to,boxTo:beyond});
  state.pushes+=1;
  pushed=true;
 }else{
  state.history.push({from,to,slot:-1,boxFrom:-1,boxTo:-1});
 }
 state.player=to;
 state.moves+=1;
 if(state.status==='ready'){
  state.status='playing';
  state.startedAt=new Date().toISOString();
 }
 if(solved(state)){
  state.status='won';
  state.finishedAt=new Date().toISOString();
 }
 return {moved:true,pushed};
}
export function undo(state){
 const step=state.history.pop();
 if(!step)return false;
 state.player=step.from;
 if(step.slot>=0){
  state.boxes[step.slot]=step.boxFrom;
  state.pushes=Math.max(0,state.pushes-1);
 }
 state.moves=Math.max(0,state.moves-1);
 if(state.status==='won'){state.status='playing';state.finishedAt=null;}
 return true;
}
export function restart(state,{now=Date.now()}={}){
 state.boxes=[...state.start.boxes];
 state.player=state.start.player;
 state.moves=0;
 state.pushes=0;
 state.history=[];
 state.status='ready';
 state.startedAt=new Date(now).toISOString();
 state.finishedAt=null;
 return state;
}
export function solve(state,{limit=250000}={}){
 const key=(boxes,player)=>boxes.slice().sort((a,b)=>a-b).join(',')+'|'+player;
 const goalSet=new Set(state.goals);
 const done=boxes=>boxes.every(box=>goalSet.has(box));
 if(done(state.boxes))return 0;
 const seen=new Set([key(state.boxes,state.player)]);
 let frontier=[[state.boxes,state.player,0]];
 while(frontier.length){
  const next=[];
  for(const [boxes,pos,depth] of frontier){
   const px=pos%state.w,py=Math.floor(pos/state.w);
   const occupied=new Set(boxes);
   for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
    const nx=px+dx,ny=py+dy;
    if(nx<0||nx>=state.w||ny<0||ny>=state.h)continue;
    const to=ny*state.w+nx;
    if(state.walls.includes(to))continue;
    let boxesNext=boxes;
    if(occupied.has(to)){
     const bx=nx+dx,by=ny+dy;
     if(bx<0||bx>=state.w||by<0||by>=state.h)continue;
     const beyond=by*state.w+bx;
     if(state.walls.includes(beyond)||occupied.has(beyond))continue;
     boxesNext=boxes.slice();
     boxesNext[boxes.indexOf(to)]=beyond;
    }
    const seenKey=key(boxesNext,to);
    if(seen.has(seenKey))continue;
    seen.add(seenKey);
    if(seen.size>limit)return null;
    if(done(boxesNext))return depth+1;
    next.push([boxesNext,to,depth+1]);
   }
  }
  frontier=next;
 }
 return null;
}
export function elapsedSeconds(state,now=Date.now()){
 if(state.status==='ready')return 0;
 const end=state.finishedAt?Date.parse(state.finishedAt):now;
 return Math.max(0,Math.round((end-Date.parse(state.startedAt))/1000));
}
export function validSave(state){
 if(!state||state.version!==1||typeof state.id!=='string'||!state.id)return false;
 const level=levelById(state.level);
 if(!level||state.par!==level.par)return false;
 const board=parse(level);
 if(state.w!==board.width||state.h!==board.height)return false;
 for(const key of ['walls','goals','boxes'])if(!Array.isArray(state[key]))return false;
 if(state.walls.length!==board.walls.length)return false;
 if(!state.walls.every((value,index)=>value===board.walls[index]))return false;
 if(state.goals.length!==board.goals.length)return false;
 if(state.boxes.length!==board.boxes.length)return false;
 const total=state.w*state.h;
 for(const box of state.boxes)if(!Number.isInteger(box)||box<0||box>=total||state.walls.includes(box))return false;
 if(new Set(state.boxes).size!==state.boxes.length)return false;
 if(!Number.isInteger(state.player)||state.player<0||state.player>=total)return false;
 if(state.walls.includes(state.player)||state.boxes.includes(state.player))return false;
 if(!Number.isInteger(state.moves)||state.moves<0)return false;
 if(!Number.isInteger(state.pushes)||state.pushes<0||state.pushes>state.moves)return false;
 if(!Array.isArray(state.history))return false;
 for(const step of state.history){
  if(!step||!Number.isInteger(step.from)||!Number.isInteger(step.to)||!Number.isInteger(step.slot)||!Number.isInteger(step.boxFrom)||!Number.isInteger(step.boxTo))return false;
 }
 if(!state.start||!Array.isArray(state.start.boxes)||state.start.boxes.length!==state.boxes.length)return false;
 if(state.start.boxes.some(box=>!Number.isInteger(box)||box<0||box>=total))return false;
 if(!Number.isInteger(state.start.player)||state.start.player<0||state.start.player>=total)return false;
 if(!['ready','playing','won'].includes(state.status))return false;
 if(!Number.isFinite(Date.parse(state.startedAt)))return false;
 if(state.status==='ready'){
  return state.moves===0&&state.finishedAt===null&&state.boxes.every((box,index)=>box===state.start.boxes[index])&&state.player===state.start.player;
 }
 if(state.moves<1)return false;
 if(state.status==='playing')return state.finishedAt===null&&!solved(state);
 if(!Number.isFinite(Date.parse(state.finishedAt||'')))return false;
 return solved(state);
}
export function recordResult(records,state,finishedAt=new Date().toISOString()){
 if(!state||state.status!=='won')return records;
 if(records.some(item=>item.id===state.id))return records;
 return [{id:state.id,level:state.level,moves:state.moves,pushes:state.pushes,par:state.par,seconds:elapsedSeconds(state,Date.parse(finishedAt)),finishedAt},...records].slice(0,50);
}
export function validRecord(item){
 return Boolean(item)&&typeof item.id==='string'&&LEVELS.some(level=>level.id===item.level)&&Number.isInteger(item.moves)&&item.moves>=1&&Number.isInteger(item.pushes)&&item.pushes>=0&&Number.isInteger(item.par)&&item.par>=0&&Number.isFinite(item.seconds)&&item.seconds>=0&&Number.isFinite(Date.parse(item.finishedAt));
}
export function summarize(records){
 const byLevel={};
 for(const level of LEVELS)byLevel[level.id]=records.filter(item=>item.level===level.id);
 return {
  done:records.length,
  cleared:LEVELS.filter(level=>byLevel[level.id].length).length,
  best:byLevel,
  bestMoves:Object.fromEntries(LEVELS.map(level=>[level.id,byLevel[level.id].length?Math.min(...byLevel[level.id].map(item=>item.moves)):null])),
  bestTime:Object.fromEntries(LEVELS.map(level=>[level.id,byLevel[level.id].length?Math.min(...byLevel[level.id].map(item=>item.seconds)):null])),
 };
}
