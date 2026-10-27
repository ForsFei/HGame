document.addEventListener('DOMContentLoaded',()=>{
 try{const id=/^\/games\/([a-z0-9-]+)\//.exec(location.pathname)?.[1];if(id){let recent=JSON.parse(localStorage.getItem('hgame-library-recent')||'[]');if(!Array.isArray(recent))recent=[];recent=[{id,at:Date.now()},...recent.filter(r=>r&&r.id!==id&&typeof r.id==='string'&&Number.isFinite(r.at))].slice(0,10);localStorage.setItem('hgame-library-recent',JSON.stringify(recent));}}catch{}
 const nav=document.querySelector('header nav')||document.querySelector('header');
 if(nav){const a=document.createElement('a');a.href='/';a.textContent='← 返回游戏库';a.title='返回 HGame 游戏库';a.style.cssText='font:inherit;font-size:11px;color:inherit;text-decoration:none;white-space:nowrap;padding:7px 9px;border:1px solid var(--line,#87969d);border-radius:4px;display:inline-flex;align-items:center';nav.append(a);}
 for(const dialog of document.querySelectorAll('dialog')){const a=document.createElement('a');a.href='/';a.dataset.libraryReturn='true';a.textContent='返回游戏库';a.style.cssText='display:block;width:fit-content;margin-top:16px;font:inherit;font-size:11px;color:inherit;text-decoration:underline;text-underline-offset:3px';dialog.append(a);}
 if(new URL(location.href).searchParams.get('libraryView')==='quiet'&&document.documentElement.dataset.view!=='quiet'){
  const toggle=document.querySelector('#view,#viewButton');if(toggle)toggle.click();
 }
});
