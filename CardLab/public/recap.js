// Observation only: never consumes random numbers or changes scoring/economy.
export const newRecap=()=>({schema:1,partial:false,stages:[]});
function stageFor(s){
 s.recap??={schema:1,partial:true,stages:[]};
 let row=s.recap.stages.find(r=>r.stage===s.stage+1);
 if(!row){row={stage:s.stage+1,score:s.score,target:0,plays:[],discards:0,transactions:[],omitted:0};s.recap.stages.push(row);}
 return row;
}
export function logPlay(s,p,target){const row=stageFor(s);row.score=s.score;row.target=target;row.plays.push({handId:p.hand.id,points:p.points,cards:p.scoring.map(c=>c.id)});}
export function logDiscard(s,target){const row=stageFor(s);row.target=target;row.discards++;}
export function logTransaction(s,event,target){const row=stageFor(s);row.target=target;if(row.transactions.length<50)row.transactions.push({...event,balance:s.money});else row.omitted++;}
const int=n=>Number.isSafeInteger(n)&&n>=0;
const id=s=>typeof s==='string'&&/^[a-zA-Z]{1,24}$/.test(s);
export function validRecap(r){
 return Boolean(r&&r.schema===1&&typeof r.partial==='boolean'&&Array.isArray(r.stages)&&r.stages.length<=8&&new Set(r.stages.map(s=>s?.stage)).size===r.stages.length&&r.stages.every(s=>s&&int(s.stage)&&s.stage>=1&&s.stage<=8&&int(s.score)&&int(s.target)&&int(s.discards)&&s.discards<=3&&int(s.omitted)&&Array.isArray(s.plays)&&s.plays.length<=4&&s.plays.every(p=>p&&id(p.handId)&&int(p.points)&&Array.isArray(p.cards)&&p.cards.length>=1&&p.cards.length<=5&&new Set(p.cards).size===p.cards.length&&p.cards.every(c=>typeof c==='string'&&/^[SHCD](?:[2-9]|1[0-4])$/.test(c)))&&Array.isArray(s.transactions)&&s.transactions.length<=50&&s.transactions.every(t=>t&&['buy','replace','sell','upgrade','reroll'].includes(t.type)&&int(t.cost)&&int(t.refund)&&int(t.balance)&&(t.type==='reroll'||t.type==='upgrade'?t.type==='reroll'||id(t.handId):id(t.moduleId))&&(t.type!=='replace'||id(t.replacedId)))));
}
