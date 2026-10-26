export function recordRun(records,state,finishedAt=new Date().toISOString()){
 if(!['won','lost'].includes(state.phase)||!state.runId)return records;
 if(records.some(r=>r.id===state.runId))return records;
 const total=state.history.reduce((sum,h)=>sum+h.score,0)+(state.phase==='lost'?state.score:0);
 return [{id:state.runId,seed:state.seed||null,version:state.version,finishedAt,outcome:state.phase,stage:state.stage+1,total,bestHand:state.version>=3?state.bestHand:null,modules:[...state.modules]},...records].slice(0,50);
}
export function validRecord(r){return r&&typeof r.id==='string'&&[1,2,3].includes(r.version)&&['won','lost'].includes(r.outcome)&&Number.isFinite(Date.parse(r.finishedAt))&&Number.isInteger(r.stage)&&r.stage>=1&&r.stage<=8&&Number.isInteger(r.total)&&r.total>=0&&(r.bestHand===null||Number.isInteger(r.bestHand)&&r.bestHand>=0)&&(r.seed===null||typeof r.seed==='string'&&/^[A-Z0-9-]{1,24}$/.test(r.seed))&&Array.isArray(r.modules)&&r.modules.every(m=>typeof m==='string');}
