(()=>{
'use strict';
const token=()=>localStorage.getItem('void_token')||'';
const api=(p,o={})=>fetch(p,{...o,headers:{...(o.headers||{}),Authorization:'Bearer '+token()}}).then(r=>r.ok?r.json():null);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let role='';
function injectCSS(){if(document.getElementById('vhr-style'))return;const s=document.createElement('style');s.id='vhr-style';s.textContent=`
.vhr-hidden{display:none!important}
.vhr-tools{display:inline-flex!important;align-items:center;gap:7px!important;border:1px solid rgba(71,255,158,.24)!important;background:linear-gradient(135deg,rgba(29,235,128,.16),rgba(29,235,128,.05))!important;box-shadow:0 0 24px rgba(32,239,137,.08);transition:transform .18s ease,box-shadow .22s ease,border-color .22s ease}
.vhr-tools:hover{transform:translateY(-1px);border-color:rgba(71,255,158,.48)!important;box-shadow:0 0 30px rgba(32,239,137,.18)}
.vhr-modal{position:fixed;inset:0;z-index:120000;background:rgba(0,8,3,.66);backdrop-filter:blur(12px);display:grid;place-items:center;padding:18px;animation:vhrFade .18s ease}
.vhr-box{width:min(760px,95vw);max-height:86vh;overflow:auto;padding:20px;border-radius:22px;border:1px solid rgba(75,255,161,.28);background:linear-gradient(145deg,rgba(5,27,14,.98),rgba(2,13,7,.98));box-shadow:0 30px 100px rgba(0,0,0,.66),0 0 40px rgba(24,239,125,.08);animation:vhrUp .22s cubic-bezier(.2,.8,.2,1)}
.vhr-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}.vhr-head h2{margin:0;font-size:21px}.vhr-head p{margin:4px 0 0;color:#7f9d8c;font-size:12px}.vhr-close{border:1px solid rgba(255,255,255,.08)!important;background:rgba(255,255,255,.05)!important;color:#fff!important;border-radius:10px!important;padding:8px 11px!important;cursor:pointer}
.vhr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.vhr-item{display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;text-align:left!important;border:1px solid rgba(255,255,255,.07)!important;background:rgba(255,255,255,.035)!important;color:#dffff0!important;border-radius:13px!important;padding:13px!important;cursor:pointer!important;transition:transform .16s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease}.vhr-item:hover{transform:translateY(-2px) scale(1.01);background:rgba(30,233,128,.10)!important;border-color:rgba(61,255,150,.28)!important;box-shadow:0 10px 30px rgba(0,0,0,.2)}.vhr-item small{display:block;color:#739181;margin-top:2px}
.vhr-badge{margin-left:auto;font-size:10px;color:#74f3aa;padding:4px 7px;border-radius:999px;background:rgba(35,220,122,.08);border:1px solid rgba(45,242,135,.14)}
@keyframes vhrFade{from{opacity:0}to{opacity:1}}@keyframes vhrUp{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(max-width:720px){.vhr-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function isUser(){return role==='user'||document.body.classList.contains('role-user')}
function findTabs(){return document.querySelector('.server-tabs')}
function currentServerName(){return document.querySelector('.server-heading h1')?.textContent?.trim()||'Server'}
function tabButtons(){const box=findTabs();if(!box)return[];return [...box.querySelectorAll('button')].filter(b=>!b.classList.contains('vhr-tools')&&!b.classList.contains('vht-trigger')&&!b.classList.contains('vhx-fleet'))}
function labelOf(b){return b.textContent.replace(/\s+/g,' ').trim()}
function openTools(){injectCSS();document.getElementById('vhr-modal')?.remove();const modal=document.createElement('div');modal.id='vhr-modal';modal.className='vhr-modal';const names=['Files','Databases','Schedules','Users','Backups','Network','Startup','Settings','Plugin Manager','Mod Manager','Modpack Manager'];const icons={'Files':'📁','Databases':'🗄️','Schedules':'⏰','Users':'👥','Backups':'💾','Network':'🌐','Startup':'⚡','Settings':'⚙️','Plugin Manager':'🧩','Mod Manager':'◇','Modpack Manager':'📦'};modal.innerHTML=`<div class="vhr-box"><div class="vhr-head"><div><h2>Server Control Center</h2><p>${esc(currentServerName())} · all server tools in one place</p></div><button class="vhr-close">✕</button></div><div class="vhr-grid" id="vhr-grid"></div></div>`;document.body.appendChild(modal);const grid=modal.querySelector('#vhr-grid');const buttons=tabButtons();for(const name of names){const b=buttons.find(x=>labelOf(x).replace(/^./,'')===name||labelOf(x).includes(name));if(!b)continue;const item=document.createElement('button');item.className='vhr-item';item.innerHTML=`<span style="font-size:19px">${icons[name]||'•'}</span><span><b>${esc(name)}</b><small>Open ${esc(name.toLowerCase())}</small></span><span class="vhr-badge">OPEN</span>`;item.onclick=()=>{modal.remove();b.click()};grid.appendChild(item)}modal.querySelector('.vhr-close').onclick=()=>modal.remove();modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()})}
function injectServerControls(){const tabs=findTabs();if(!tabs)return;const existing=tabs.querySelector('[data-vhr-tools]');const user=isUser();
  tabButtons().forEach(b=>{const l=labelOf(b);if(l.includes('Activity'))b.classList.add('vhr-hidden');else if(user&&/Databases|Schedules|Users|Backups|Network|Startup|Settings|Plugin Manager|Mod Manager|Modpack Manager/.test(l))b.classList.add('vhr-hidden')});
  if(user&&!existing){const b=document.createElement('button');b.className='vhr-tools';b.dataset.vhrTools='1';b.innerHTML='<span>⚙️</span><span>Server Tools</span><span>›</span>';b.onclick=openTools;tabs.appendChild(b)}
  if(!user&&existing)existing.remove();
}
function hideUserMemory(){if(!isUser())return;document.querySelectorAll('*').forEach(el=>{if(el.children.length>0)return;const t=(el.textContent||'').trim();if(!t)return;if(/^MEMORY$/i.test(t)||/^RAM$/i.test(t)){
    const card=el.closest('.card,.table-row,.panel,.mini-card');if(card)card.classList.add('vhr-hidden');
  }});document.querySelectorAll('.table-head,.table-row').forEach(row=>{[...row.children].forEach((c,i)=>{if(/^(RAM|MEMORY)$/i.test((document.querySelector('.table-head')?.children[i]?.textContent||'').trim()))row.children[i]?.classList.add('vhr-hidden')})})}
function hideActivity(){document.querySelectorAll('button,a').forEach(el=>{if(/Activity log/i.test(el.textContent||''))el.classList.add('vhr-hidden')});}
async function initRole(){if(role)return;try{const d=await api('/api/auth/me');role=d?.user?.role||''}catch{role=''}injectCSS()}
setInterval(()=>{injectServerControls();hideUserMemory();hideActivity()},500);
initRole();
})();
