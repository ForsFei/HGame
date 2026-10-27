import {LEVELS,generate} from '../public/engine.js';

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
 let ok=0,tries=0,worst=0;
 for(let i=0;i<rounds;i++){
  const first=Math.floor(random()*level.size*level.size);
  const result=generate(level.size,level.mines,first,random);
  tries+=result.attempts;
  worst=Math.max(worst,result.attempts);
  if(result.solvable)ok++;
 }
 console.log(`${level.id.padEnd(7)} ${level.size}x${level.size}/${level.mines}  solvable ${ok}/${rounds}  avg=${(tries/rounds).toFixed(1)}  worst=${worst}  ${Date.now()-started}ms`);
}
