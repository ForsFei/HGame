const root=document.documentElement;
const fallbackKey='crateshift-view';

function read(key){
 try{return localStorage.getItem(key);}catch{return null;}
}
function write(key,value){
 try{localStorage.setItem(key,value);}catch{}
}

/**
 * 视图切换：同一套界面，两套文案与配色。
 * 返回 {quiet, toggle, paint}，quiet 为 getter，可在任意时刻读取当前状态。
 */
export function setupQuiet({key=fallbackKey,standardTitle,quietTitle,onApply}={}){
 const titles={
  standard:standardTitle||document.title||'托盘上架 · HGame',
  quiet:quietTitle||standardTitle||document.title||'库位归位 · 本地'
 };
 let quiet=read(key)==='quiet';

 const paint=()=>{
  root.dataset.view=quiet?'quiet':'standard';
  document.title=quiet?titles.quiet:titles.standard;
  const button=document.getElementById('view');
  if(button){
   button.textContent=quiet?'标准视图':'简洁模式';
   button.title=quiet?'切换到标准视图（Alt+M）':'切换到简洁模式（Alt+M）';
   button.setAttribute('aria-pressed',String(quiet));
  }
 };

 const toggle=()=>{
  quiet=!quiet;
  write(key,quiet?'quiet':'standard');
  paint();
  if(typeof onApply==='function')onApply();
 };

 paint();

 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.repeat)return;
  if(!event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(event.key.toLowerCase()!=='m')return;
  const target=event.target;
  if(target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)))return;
  event.preventDefault();
  toggle();
 });

 return {
  get quiet(){return quiet;},
  toggle,
  paint
 };
}
