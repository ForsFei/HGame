import {LEVELS,generate,solved,openEnds} from '../public/engine.js';

function mulberry32(seed){
 let a=seed>>>0;
 return function(){
  a=(a+0x6D2B79F5)>>>0;
  let t=Math.imul(a^(a>>>15),1|a);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
const rounds=Number(process.argv[2]||40);
for(const level of LEVELS){
 const random=mulberry32(level.size*7919+2026);
 const started=Date.now();
 let openTotal=0,startedSolved=0;
 for(let i=0;i<rounds;i++){
  const {tiles,solution,locked}=generate(level.size,random);
  if(!solved(solution,level.size))throw new Error(`${level.id} 第 ${i} 局解不成立`);
  if(solved(tiles,level.size))startedSolved++;
  openTotal+=openEnds(tiles,level.size);
  if(locked.filter(Boolean).length!==2)throw new Error(`${level.id} 网关数量异常`);
 }
 const spent=Date.now()-started;
 console.log(`${level.id.padEnd(7)} ${level.size}x${level.size}  ${rounds} 局  ${(spent/rounds).toFixed(2)}ms/局  开局断口均 ${(openTotal/rounds).toFixed(1)}  开局已完成 ${startedSolved}`);
}
