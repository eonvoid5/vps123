(()=>{
'use strict';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const txt=e=>String(e?.textContent||'').trim().toLowerCase();
function clean(){
  const isUser=document.body.classList.contains('role-user')||!!localStorage.getItem('void_token');
  if(!isUser)return;
  // Keep exactly one injected navigation item of each type.
  const nav=document.querySelector('.sidebar nav');
  if(nav){
    for(const label of ['my servers','console']){
      const items=[...nav.querySelectorAll('.void-normal-nav')].filter(x=>txt(x.querySelector('span:nth-child(2)'))===label);
      items.slice(1).forEach(x=>x.remove());
    }
  }
  // React re-renders the dashboard, so remove stale copies before allowing one replacement.
  const specs=[...document.querySelectorAll('.void-user-specs')];
  specs.slice(1).forEach(x=>x.remove());
  // Hide Active Servers and replace it with one VPS specification panel.
  const active=[...document.querySelectorAll('.panel,.card')].find(x=>txt(x.querySelector('.panel-title h2,.panel-title h3,h2,h3'))==='active servers');
  if(active){
    active.style.display='none';
    const parent=active.parentElement;
    if(parent && !parent.querySelector('.void-user-specs')){
      const box=document.createElement('section');
      box.className='panel glass void-user-specs';
      box.innerHTML='<div class="panel-title"><h2>VPS SPECIFICATIONS</h2><span>Node environment</span></div>';
      parent.insertBefore(box,active);
      loadSpecs(box);
    }
  }
  // Normal users should not see the dashboard's recent activity feed.
  for(const p of [...document.querySelectorAll('.panel,.card')]){
    const heading=txt(p.querySelector('.panel-title h2,.panel-title h3,h2,h3'));
    if(heading==='recent activity' || heading==='activity log') p.style.display='none';
  }
}
async function loadSpecs(box){
  try{
    const token=localStorage.getItem('void_token')||'';
    const r=await fetch('/api/system',{headers:token?{Authorization:'Bearer '+token}:{} ,cache:'no-store'});
    const s=await r.json();
    const cards=[
      ['CPU',Number(s.cpu||0).toFixed(2),`${s.cores||0} cores`],
      ['NODE',s.hostname||location.hostname,'VPS host'],
      ['RUNTIME',s.node||'Node.js','Node runtime'],
      ['DISK','Available','Storage']
    ];
    box.insertAdjacentHTML('beforeend',cards.map(([a,b,c],i)=>`<div class="void-user-spec" style="animation-delay:${i*60}ms"><small>${a}</small><strong>${b}</strong><span>${c}</span></div>`).join(''));
  }catch{}
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;clean()})}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
setInterval(clean,2000);
clean();
})();
