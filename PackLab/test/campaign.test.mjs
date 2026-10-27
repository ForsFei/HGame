import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,ITEMS,effects,intent,startBattle,activate,endTurn,takeReward,buy,skipReward,rest,autoPlace,rotate,validSave} from '../public/engine.js';
test('twelve seeded eight-floor campaigns complete using legal purchases, placements and combat; saves restore each step',()=>{
 const priority={hammer:10,spark:12,bow:12,armor:11,stone:9,dagger:8,blade:8,spear:6,shield:7,herb:4,flask:4,pouch:2};
 for(let seed=0;seed<12;seed++){
  let s=createGame(`RUN-${seed}`,{version:1}),ticks=0;
  while(!['lost','won'].includes(s.phase)&&ticks++<400){
   if(['prepare','camp'].includes(s.phase)){
    if(s.phase==='camp'){
     if(s.hp<=30&&s.gold>=4)rest(s);
     const rank=type=>priority[type]-(s.items.filter(i=>i.type===type).length>1?8:0);
     const reward=s.rewards.map((type,index)=>({type,index})).sort((a,b)=>rank(b.type)-rank(a.type))[0];
     if(s.items.length<12)takeReward(s,reward.index);else skipReward(s);
     for(const {o,index} of s.offers.map((o,index)=>({o,index})).sort((a,b)=>rank(b.o.type)-rank(a.o.type)))if(rank(o.type)>=7&&s.gold>=ITEMS[o.type].price&&s.items.length<12)buy(s,index);
     for(const i of s.items.filter(i=>i.x===null))for(let n=0;n<4&&i.x===null;n++){try{autoPlace(s,i.uid);}catch{rotate(s,i.uid);}}
    }
    startBattle(s);
   }else{
    for(const i of [...s.items])if(i.x!==null&&i.type==='herb'&&s.hp<=30)activate(s,i.uid);
    const defense=intent(s)[0]==='attack'?Math.max(0,intent(s)[1]-s.block):0;
    if(defense>0){const shield=s.items.find(i=>i.x!==null&&i.type==='shield');if(shield)activate(s,shield.uid);}
    const weapons=s.items.filter(i=>i.x!==null&&ITEMS[i.type].kind==='weapon');let best={ids:[],damage:0};
    for(let mask=1;mask<1<<weapons.length;mask++){const chosen=weapons.filter((_,i)=>mask>>i&1),cost=chosen.reduce((n,i)=>n+ITEMS[i.type].cost,0),damage=chosen.reduce((n,i)=>n+effects(s,i).damage,0);if(cost<=s.energy&&damage>best.damage)best={ids:chosen.map(i=>i.uid),damage};}
    for(const id of best.ids)if(s.phase==='battle')activate(s,id);if(s.phase==='battle')endTurn(s);
   }
   assert.ok(validSave(s),`${s.seed} ${s.floor} ${s.phase}`);s=JSON.parse(JSON.stringify(s));
  }
  assert.equal(s.phase,'won',s.seed);assert.equal(s.floor,7);
 }
});
