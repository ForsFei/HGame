import {LEVELS,solve,minimumMoves,generate,litCount} from '../public/engine.js';

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
 let blocked=0;
 for(let round=0;round<rounds;round++){
  const lights=Array.from({length:level.size*level.size},()=>random()<0.5?1:0);
  if(!solve(lights,level.size))blocked++;
 }
 console.log(`${level.id.padEnd(7)} ${level.size}x${level.size}  随机布局不可解 ${blocked}/${rounds}`);
}

for(const level of LEVELS){
 const random=mulberry32(level.size*104729+7);
 const started=Date.now();
 let minOpt=Infinity,maxOpt=0,minLit=Infinity,maxLit=0;
 for(let round=0;round<rounds;round++){
  const {lights,optimal}=generate(level.size,random,level.minMoves);
  if(optimal===null)throw new Error(`${level.id} 第 ${round} 局不可解`);
  if(optimal<level.minMoves)throw new Error(`${level.id} 最优步数低于下限`);
  if(minimumMoves(lights,level.size)!==optimal)throw new Error('最优步数复算不一致');
  minOpt=Math.min(minOpt,optimal);maxOpt=Math.max(maxOpt,optimal);
  minLit=Math.min(minLit,litCount(lights));maxLit=Math.max(maxLit,litCount(lights));
 }
 console.log(`${level.id.padEnd(7)} ${level.size}x${level.size}  最优 ${minOpt}..${maxOpt} 步  亮灯 ${minLit}..${maxLit}  ${((Date.now()-started)/rounds).toFixed(2)}ms/局`);
}
