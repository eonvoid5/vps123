(()=>{
'use strict';
const token=()=>localStorage.getItem('void_token')||'';
const api=async(path)=>{const h=new Headers();const t=token();if(t)h.set('Authorization','Bearer '+t);const r=await fetch(path,{headers:h,cache:'no-store'});const x=await r.text();let d;try{d=JSON.parse(x)}catch{d=x}if(!r.ok)throw new Error(d?.error||`HTTP ${r.status}`);return d};
const text=e=>String(e?.textContent||'').trim().toLowerCase();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let busy=false;
function css(){
 if(document.getElementById('void-normal-safe-css')) return;
 const s=document.createElement('style'); s.id='void-normal-safe-css'; s.textContent=`
 #void-normal-specs{display:block!important;margin-top:14px;padding:18px;border:1px solid rgba(70,250,155,.14);border-radius:16px;background:rgba(2,11,7,.48);box-shadow:0 0 28px rgba(40,245,141,.05)}
 #void-normal-specs .vnsp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;color:#effff5}#void-normal-specs .vnsp-head span{color:#789383;font-size:11px}
 #void-normal-specs .vnsp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.vnsp-card{padding:14px;border:1px solid rgba(70,250,155,.1);border-radius:12px;background:rgba(2,11,7,.38);animation:vnspIn .3s ease both}.vnsp-card small{display:block;color:#718b7c;font-size:9px;letter-spacing:.12em}.vnsp-card strong{display:block;margin-top:6px;color:#effff4;font-size:16px}.vnsp-card em{display:block;margin-top:4px;color:#57e89d;font-size:10px;font-style:normal}
 @keyframes vnspIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
 @media(max-width:900px){#void-normal-specs .vnsp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){#void-normal-specs .vnsp-grid{grid-template-columns:1fr}}
 `; document.head.appendChild(s);
}
async function currentUser(){try{return (await api('/api/auth/me'))?.user||null}catch{return null}}
function findPanel(title){return [...document.querySelectorAll('.panel,.card')].find(p=>text(p.querySelector('.panel-title h2,.panel-title h3,h2,h3'))===title.toLowerCase())}
function removeDuplicateSpecs(){
 const matches=[...document.querySelectorAll('.panel,.card,section')].filter(p=>text(p.querySelector('.panel-title h2,.panel-title h3,h2,h3'))==='vps specifications');
 let keeper=document.getElementById('void-normal-specs');
 if(!keeper && matches.length) keeper=matches[0];
 matches.forEach(p=>{if(p!==keeper)p.remove()});
 if(keeper){keeper.id='void-normal-specs';return keeper}
 return null;
}
function normalizeDashboard(){
 const active=findPanel('active servers');
 if(active) active.style.display='none';
 const activity=findPanel('recent activity');
 if(activity) activity.style.display='none';
 if(!active?.parentElement)return;
 let box=removeDuplicateSpecs();
 if(!box){
   box=document.createElement('section'); box.id='void-normal-specs';
   box.innerHTML='<div class="vnsp-head"><b>VPS SPECIFICATIONS</b><span>Node environment</span></div><div class="vnsp-grid" id="vnsp-grid"></div>';
   active.parentElement.insertBefore(box,active);
 }
 if(!document.getElementById('vnsp-grid')) box.insertAdjacentHTML('beforeend','<div class="vnsp-grid" id="vnsp-grid"></div>');
 loadSpecs();
}
async function loadSpecs(){const g=document.getElementById('vnsp-grid');if(!g||g.dataset.loaded==='1')return;g.dataset.loaded='1';try{const s=await api('/api/system');const cards=[['CPU',Number(s.cpu||0).toFixed(2),`${s.cores||0} cores`],['NODE',s.hostname||location.hostname,'VPS host'],['RUNTIME',s.node||'Node.js','Node runtime'],['DISK',typeof s.diskUsed==='number'&&typeof s.diskTotal==='number'?`${(s.diskUsed/1073741824).toFixed(1)}/${(s.diskTotal/1073741824).toFixed(1)} GB`:'Available','Storage']];g.innerHTML=cards.map(([a,b,c],i)=>`<div class="vnsp-card" style="animation-delay:${i*60}ms"><small>${esc(a)}</small><strong>${esc(b)}</strong><em>${esc(c)}</em></div>`).join('')}catch{}}
async function run(){if(busy)return;busy=true;try{const u=await currentUser();if(u?.role!=='user')return;css();normalizeDashboard()}finally{busy=false}}
let queued=false;const mo=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run().catch(()=>{})})});mo.observe(document.documentElement,{childList:true,subtree:true});run();
})();
