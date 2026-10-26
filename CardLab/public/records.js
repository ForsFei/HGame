import {validRecap} from './recap.js';
import {DECKS,DIFFICULTIES} from './engine.js';
export function recordRun(records,state,finishedAt=new Date().toISOString()){
 if(!['won','lost'].includes(state.phase)||!state.runId)return records;
 if(records.some(r=>r.id===state.runId))return records;
 const total=state.history.reduce((sum,h)=>sum+h.score,0)+(state.phase==='lost'?state.score:0);
 return [{id:state.runId,seed:state.seed||null,version:state.version,deckProfile:state.version>=4?state.deckProfile:'standard',difficulty:state.version>=4?state.difficulty:'normal',finishedAt,outcome:state.phase,stage:state.stage+1,total,bestHand:state.version>=3?state.bestHand:null,modules:[...state.modules],recap:state.recap?structuredClone(state.recap):null},...records].slice(0,50);
}
export function validRecord(r){return r&&(r.recap==null||validRecap(r.recap))&&typeof r.id==='string'&&[1,2,3,4,5].includes(r.version)&&(r.version<4?r.deckProfile===undefined||Object.hasOwn(DECKS,r.deckProfile):Object.hasOwn(DECKS,r.deckProfile))&&(r.version<4?r.difficulty===undefined||Object.hasOwn(DIFFICULTIES,r.difficulty):Object.hasOwn(DIFFICULTIES,r.difficulty))&&['won','lost'].includes(r.outcome)&&Number.isFinite(Date.parse(r.finishedAt))&&Number.isInteger(r.stage)&&r.stage>=1&&r.stage<=8&&Number.isInteger(r.total)&&r.total>=0&&(r.bestHand===null||Number.isInteger(r.bestHand)&&r.bestHand>=0)&&(r.seed===null||typeof r.seed==='string'&&/^[A-Z0-9-]{1,24}$/.test(r.seed))&&Array.isArray(r.modules)&&r.modules.every(m=>typeof m==='string');}
