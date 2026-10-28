// Public UI helpers. Battle state and authoritative rules stay in the local Python worker.
export const STAT_LABELS={hp:'生命',atk:'物攻',spatk:'魔攻',def:'物防',spdef:'魔防',speed:'速度'};
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function defaultSkills(pet,skills){
 const known=pet.skills.map(name=>skills.find(s=>s.name===name)).filter(Boolean);
 const attacks=known.filter(s=>s.power>0).sort((a,b)=>(a.cost>6)-(b.cost>6)||(b.type===pet.type)-(a.type===pet.type)||b.power/Math.max(1,b.cost)-a.power/Math.max(1,a.cost));
 return [...new Set([...attacks.slice(0,2),...known.filter(s=>s.power===0).slice(0,2),...known].map(s=>s.name))].slice(0,4);
}
export function safeStored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
