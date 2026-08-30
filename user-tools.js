(()=>{
'use strict';
function css(){if(document.getElementById('vhu-style'))return;const s=document.createElement('style');s.id='vhu-style';s.textContent=`
body.role-user .vhu-hide{display:none!important}
`;document.head.appendChild(s)}
function isUser(){return document.body.classList.contains('role-user')}
function removeToolsModal(){
  document.querySelectorAll('#vhu-modal,.vhu-modal,.vhr-modal,#vhu-tools,[data-vhu-tools],[data-vhr-tools]').forEach(el=>el.remove());
  document.querySelectorAll('button,a').forEach(el=>{
    const t=(el.textContent||'').replace(/\\s+/g,' ').trim();
    if(/^⚙️?\s*Server Tools(?:\s*›)?$/i.test(t))el.remove();
  });
}
function keepDirectTabs(){
  if(!isUser())return;
  const root=document.querySelector('.server-tabs');
  if(!root)return;
  root.querySelectorAll('button,a,[role="tab"]').forEach(el=>{
    const t=(el.textContent||'').replace(/\\s+/g,' ').trim();
    if(!t)return;
    if(/^Activity(?: Log)?$/i.test(t))el.classList.add('vhu-hide');
    else if(/^(Console|Files|Databases|Schedules|Users|Backups|Network|Startup|Settings|Plugin Manager|Mod Manager|Modpack Manager|Managers|⚡?\s*PRO TOOLS)/i.test(t)){
      el.classList.remove('vhu-hide','vhr-hidden','vhu-hide');
      el.style.removeProperty('display');
    }
  });
}
function hideActivity(){
  if(!isUser())return;
  document.querySelectorAll('button,a,[role="tab"],section,.panel-title').forEach(el=>{
    const t=(el.textContent||'').replace(/\\s+/g,' ').trim();
    if(/^Activity(?: Log)?$/i.test(t))el.classList.add('vhu-hide');
  });
}
function hideMemory(){
  if(!isUser())return;
  document.querySelectorAll('*').forEach(el=>{
    if(el.children.length>0)return;
    const t=(el.textContent||'').trim();
    if(!/^(MEMORY|RAM)$/i.test(t))return;
    el.closest('.card,.table-row,.panel,.mini-card,.stat-card')?.classList.add('vhu-hide');
  });
  document.querySelectorAll('.table-head,.table-row').forEach(row=>{
    [...row.children].forEach((c,i)=>{
      const head=document.querySelector('.table-head')?.children[i]?.textContent?.trim()||'';
      if(/^(RAM|MEMORY)$/i.test(head)||/^\\d+\\s*MB$/i.test(c.textContent.trim()))c.classList.add('vhu-hide');
    });
  });
}
css();
setInterval(()=>{removeToolsModal();keepDirectTabs();hideActivity();hideMemory()},400);
})();
