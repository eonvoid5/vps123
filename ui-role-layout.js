(()=>{
'use strict';
const token=()=>localStorage.getItem('void_token')||'';
const api=(p,o={})=>fetch(p,{...o,headers:{...(o.headers||{}),Authorization:'Bearer '+token()}}).then(r=>r.ok?r.json():null);
let role='';
function css(){if(document.getElementById('vhr-style'))return;const s=document.createElement('style');s.id='vhr-style';s.textContent=`
.vhr-hidden{display:none!important}
body.role-user .user-memory-hidden{display:none!important}
`;document.head.appendChild(s)}
function isUser(){return role==='user'||document.body.classList.contains('role-user')}
function hideActivity(){
  if(!isUser())return;
  document.querySelectorAll('button,a,[role="tab"],section,.panel-title').forEach(el=>{
    const t=(el.textContent||'').replace(/\s+/g,' ').trim();
    if(/^Activity(?: Log)?$/i.test(t) || /^Activity Log$/i.test(t)) el.classList.add('vhr-hidden');
  });
}
function hideMemory(){
  if(!isUser())return;
  document.querySelectorAll('*').forEach(el=>{
    if(el.children.length>0)return;
    const t=(el.textContent||'').trim();
    if(!/^(MEMORY|RAM)$/i.test(t))return;
    const card=el.closest('.card,.table-row,.panel,.mini-card,.stat-card');
    if(card)card.classList.add('vhr-hidden');
  });
  document.querySelectorAll('.table-head,.table-row').forEach(row=>{
    [...row.children].forEach((c,i)=>{
      const head=document.querySelector('.table-head')?.children[i]?.textContent?.trim()||'';
      if(/^(RAM|MEMORY)$/i.test(head) || /^\d+\s*MB$/i.test(c.textContent.trim())) c.classList.add('vhr-hidden');
    });
  });
}
async function initRole(){
  try{
    const d=await api('/api/auth/me');
    role=d?.user?.role||'';
    if(role)document.body.classList.add('role-'+role);
  }catch{}
  css();
}
setInterval(()=>{hideActivity();hideMemory()},500);
initRole();
})();
