import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,BUILDS,ITEMS,intent,startBattle,activate,endTurn,takeReward,buy,skipReward,rest,autoPlace,rotate,validSave,combatPreview} from '../public/engine.js';
test('sixteen v2 campaigns exercise every build and elite with save/restore; all reach the final floor',()=>{
 const base={hammer:10,spark:12,bow:12,armor:11,stone:9,dagger:8,blade:8,spear:6,shield:7,herb:5,flask:4,pouch:2,quiver:7,crossbow:11,tower:7,bash:8,bomb:8,kit:5};
 const expectedLosses=new Set(['bulwark:2','alchemist:1','alchemist:3']);
 for(const build of Object.keys(BUILDS))for(let seed=0;seed<4;seed++){
  let s=createGame(`V2-${seed}`,{build}),ticks=0;
  while(!['lost','won'].includes(s.phase)&&ticks++<400){
   if(['prepare','camp'].includes(s.phase)){
    if(s.phase==='camp'){
     if(s.hp<=30&&s.gold>=4)rest(s);
     const rank=type=>base[type]-(s.items.filter(i=>i.type===type).length>1?8:0)+(build==='archer'&&['bow','crossbow','quiver'].includes(type)?3:0)+(build==='bulwark'&&['bash','armor'].includes(type)?3:0);
     const reward=s.rewards.map((type,index)=>({type,index})).sort((a,b)=>rank(b.type)-rank(a.type))[0];
     if(s.items.length<12)takeReward(s,reward.index);else skipReward(s);
     for(const {o,index} of s.offers.map((o,index)=>({o,index})).sort((a,b)=>rank(b.o.type)-rank(a.o.type)))if(rank(o.type)>=7&&s.gold>=ITEMS[o.type].price&&s.items.length<12)buy(s,index);
     for(const i of s.items.filter(i=>i.x===null))for(let n=0;n<4&&i.x===null;n++){try{autoPlace(s,i.uid);}catch{rotate(s,i.uid);}}
    }
    startBattle(s);
   }else{
    for(const i of [...s.items])if(s.phase==='battle'&&i.x!==null&&i.type==='herb'&&s.hp<=27)activate(s,i.uid);
    for(const i of [...s.items])if(s.phase==='battle'&&i.x!==null&&i.type==='bomb')activate(s,i.uid);
    if(s.phase==='battle'){
     const defense=intent(s)[0]==='attack'?Math.max(0,intent(s)[1]-s.block):0;
     const shield=s.items.find(i=>i.x!==null&&i.type==='shield')||s.items.find(i=>i.x!==null&&i.type==='tower');
     if(shield&&(defense>0||s.items.some(i=>i.type==='bash'&&i.x!==null)))activate(s,shield.uid);
     let guard=0;
     while(s.phase==='battle'&&guard++<12){
      const next=s.items.filter(i=>i.x!==null&&ITEMS[i.type].kind==='weapon'&&!s.used.includes(i.uid)&&ITEMS[i.type].cost<=s.energy).map(i=>({i,p:combatPreview(s,i.uid)})).sort((a,b)=>(b.p.damageDealt-b.p.retaliationDamage*2)/ITEMS[b.i.type].cost-(a.p.damageDealt-a.p.retaliationDamage*2)/ITEMS[a.i.type].cost)[0];
      if(!next)break;activate(s,next.i.uid);
     }
     if(s.phase==='battle')endTurn(s);
    }
   }
   assert.ok(validSave(s),`${build} ${seed} ${s.floor} ${s.phase}`);s=JSON.parse(JSON.stringify(s));
  }
  assert.equal(s.floor,7,`${build}:${seed}`);assert.equal(s.phase,expectedLosses.has(`${build}:${seed}`)?'lost':'won',`${build}:${seed}`);
 }
});
