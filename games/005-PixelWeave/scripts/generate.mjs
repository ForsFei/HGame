import {writeFile} from 'node:fs/promises';
import {isUnique} from '../public/engine.js';

function mulberry32(seed){
 let a=seed>>>0;
 return function(){
  a=(a+0x6D2B79F5)>>>0;
  let t=Math.imul(a^(a>>>15),1|a);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
const HAND_5=[
 ['小船','00100','01110','11111','01110','00100'],
 ['十字','00100','00100','11111','00100','00100'],
 ['心形','01010','11111','11111','01110','00100'],
 ['沙漏','11111','01110','00100','01110','11111'],
 ['台阶','10000','11000','11100','11110','11111'],
 ['钥匙','11100','10100','11100','10000','10000'],
 ['字母T','11111','00100','00100','00100','00100'],
 ['漏斗','11111','01110','01110','00100','00100'],
 ['双柱','10001','10001','11111','10001','10001'],
 ['旗子','01110','01110','01110','00100','00100'],
 ['方框','11111','10001','10001','10001','11111'],
 ['波纹','11001','11011','01010','11011','10011']
];
function makePattern(size,random){
 const grid=Array.from({length:size},()=>Array(size).fill(0));
 const blobs=2+Math.floor(random()*3);
 for(let b=0;b<blobs;b++){
  const cx=random()*size,cy=random()*size;
  const rx=0.2*size+random()*0.3*size,ry=0.2*size+random()*0.3*size;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const dx=(x-cx)/rx,dy=(y-cy)/ry;
   if(dx*dx+dy*dy<=1)grid[y][x]^=1;
  }
 }
 const flips=Math.floor(size*size*0.05);
 for(let i=0;i<flips;i++)grid[Math.floor(random()*size)][Math.floor(random()*size)]^=1;
 return grid.map(row=>row.join(''));
}
function accept(puzzle){
 const total=puzzle.solution.join('').split('').filter(ch=>ch==='1').length;
 const area=puzzle.size*puzzle.size;
 if(total<area*0.2||total>area*0.8)return false;
 return isUnique(puzzle);
}
const out=[];
let id=0;
for(const [name,...rows] of HAND_5){
 id++;
 const puzzle={id:`S5-${String(id).padStart(2,'0')}`,size:5,name,solution:rows};
 const ok=accept(puzzle);
 console.log(`5x5 ${name}: ${ok?'ok':'rejected'}`);
 if(ok)out.push(puzzle);
}
for(const size of [10,15]){
 const random=mulberry32(size*7919+2026);
 const target=size===10?12:6;
 const found=[];
 let tries=0;
 const started=Date.now();
 while(found.length<target&&tries<1500){
  tries++;
  const solution=makePattern(size,random);
  const puzzle={id:`S${size}-${String(found.length+1).padStart(2,'0')}`,size,name:`No.${String(found.length+1).padStart(2,'0')}`,solution};
  if(accept(puzzle))found.push(puzzle);
 }
 console.log(`${size}x${size}: ${found.length}/${target} in ${tries} tries, ${Date.now()-started}ms`);
 out.push(...found);
}
out.sort((a,b)=>a.size-b.size||a.id.localeCompare(b.id));
const body=out.map(p=>` {id:'${p.id}',size:${p.size},name:'${p.name}',solution:['${p.solution.join("','")}']}`).join(',\n');
await writeFile(new URL('../public/puzzles.js',import.meta.url),`export const PUZZLES=[\n${body}\n];\n`,{encoding:'utf8'});
console.log(`wrote ${out.length} puzzles`);
