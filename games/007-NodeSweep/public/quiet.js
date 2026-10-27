// 简洁模式公共实现。改这里之后，把副本同步到各游戏 public/quiet.js。
// 每个游戏仍然自带一份副本，保证单独拷贝目录即可运行。
export function setupQuiet({key,standardTitle,quietTitle,onApply}={}){
 const root=document.documentElement;
 let quiet=root.dataset.view==='quiet';
 const apply=value=>{
  quiet=Boolean(value);
  root.dataset.view=quiet?'quiet':'standard';
  document.title=quiet?quietTitle:standardTitle;
  try{localStorage.setItem(key,quiet?'quiet':'standard');}catch{}
  if(onApply)onApply(quiet);
 };
 document.addEventListener('keydown',event=>{
  if(event.altKey&&event.code==='KeyM'&&!event.repeat){event.preventDefault();apply(!quiet);}
 });
 return {get quiet(){return quiet;},set quiet(value){apply(value);},toggle(){apply(!quiet);},sync(){apply(quiet);}};
}
export function readJSON(key,fallback=null){
 try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}
}
export function writeJSON(key,value){
 try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}
}
export function formatNumber(value,{digits=1}={}){
 if(!Number.isFinite(value))return '0';
 if(Math.abs(value)<1000)return String(Math.round(value*10)/10);
 const units=['K','M','B','T'];
 let tier=-1,scaled=value;
 while(Math.abs(scaled)>=1000&&tier<units.length-1){scaled/=1000;tier++;}
 return `${scaled.toFixed(scaled>=100?0:digits)}${units[tier]}`;
}
