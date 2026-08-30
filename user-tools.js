(()=>{
'use strict';
function css(){if(document.getElementById('vhu-style'))return;const s=document.createElement('style');s.id='vhu-style';s.textContent=`
body.role-user .vhu-hide{display:none!important}
`;document.head.appendChild(s)}
function isUser(){return document.body.classList.contains('role-user')}
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
setInterval(()=>{hideActivity();hideMemory()},500);
})();
