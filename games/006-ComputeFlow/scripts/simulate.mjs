import {NODES,NODE_INDEX,createGame,tick,buy,costOf,unitOutput,rateOf,format} from '../public/engine.js';

function marginal(state,node){
 const count=state.counts[node.id]||0;
 const cost=costOf(node,count);
 const after=(count+1)*unitOutput(node,count+1);
 const now=count*unitOutput(node,count);
 return {node,cost,value:(after-now)/cost};
}
export function simulate(minutes=60,{step=0.5,buyEvery=0.5}={}){
 const state=createGame(0);
 const log=[];
 let nextReport=60,nextBuy=buyEvery,purchases=0;
 for(let t=0;t<minutes*60;t+=step){
  tick(state,t*1000);
  if(t>=nextBuy){
   const options=NODES.map(node=>marginal(state,node)).filter(option=>option.cost<=state.credits);
   if(options.length){
    options.sort((a,b)=>b.value-a.value);
    buy(state,options[0].node.id);
    purchases++;
   }
   nextBuy+=buyEvery;
  }
  if(t>=nextReport){log.push({minute:nextReport/60,rate:rateOf(state),credits:state.credits,counts:{...state.counts},purchases});nextReport+=60;}
 }
 return {state,log};
}
if(process.argv[1]&&process.argv[1].endsWith('simulate.mjs')){
 const minutes=Number(process.argv[2]||60);
 const {state,log}=simulate(minutes);
 for(const row of log){
  const owned=NODES.filter(node=>row.counts[node.id]>0).map(node=>`${node.id}:${row.counts[node.id]}`).join(' ');
  console.log(`${String(row.minute).padStart(3)}m  rate=${format(row.rate).padStart(7)}/s   buys=${String(row.purchases).padStart(3)}   ${owned}`);
 }
 console.log(`final credits=${format(state.credits)} total=${format(state.totalEarned)}`);
}
