import {createSeededGame,preview,play,discard,buyModule,upgrade,nextStage,MODULES,TARGETS} from '../public/engine.js';
const count=Number(process.argv[2]||32);
const policies={compact:['small','pair','even','odd','spark','red','black','echo','anchor','wallet','reserve','face','sequence','flush'],suited:['flush','sequence','red','black','echo','reserve','even','odd','pair','spark','face','small','wallet','anchor']};
function best(s){let top=null;for(let mask=1;mask<1<<s.hand.length;mask++){const cards=s.hand.filter((_,i)=>mask>>i&1);if(cards.length>5)continue;const p=preview(s,cards);if(!p.blocked&&(!top||p.points>top.points))top={points:p.points,ids:cards.map(c=>c.id),scoring:p.scoring.map(c=>c.id)};}return top;}
function run(seed,version,priority){const s=createSeededGame(seed);s.version=version;while(!['won','lost'].includes(s.phase)){
 if(s.phase==='shop'){
  const indices=s.shop.modules.map((o,i)=>({i,id:o.id})).sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id));
  for(const o of indices){const m=MODULES.find(m=>m.id===o.id);if(s.money>=m.price&&s.modules.length<5)buyModule(s,o.i);}
  for(let i=0;i<2;i++)if(s.money>=5)upgrade(s,i);nextStage(s);continue;
 }
 const b=best(s);
 if(s.discards>0&&b.points<(TARGETS[s.stage]-s.score)/s.hands){
  const bySuit=['S','H','C','D'].map(suit=>s.hand.filter(c=>c.suit===suit)).sort((a,b)=>b.length-a.length);
  const keep=bySuit[0].length>=4?bySuit[0].map(c=>c.id):b.scoring;
  const drop=s.hand.filter(c=>!keep.includes(c.id)).slice(0,5).map(c=>c.id);if(drop.length){discard(s,drop);continue;}
 }
 play(s,b.ids);
 }return s;}
const results=[];
for(const version of [2,3])for(const [policy,priority]of Object.entries(policies)){
 let wins=0,stageTotal=0;const reached=Array(8).fill(0);
 for(let i=0;i<count;i++){const s=run(`BALANCE-${i}`,version,priority);wins+=s.phase==='won';stageTotal+=s.stage+1;for(let j=0;j<=s.stage;j++)reached[j]++;}
 results.push({version,policy,games:count,wins,meanStage:Number((stageTotal/count).toFixed(2)),reached});
}
console.log(JSON.stringify({note:'Deterministic greedy best-hand player with two shop preferences, not human win rates.',results},null,2));
