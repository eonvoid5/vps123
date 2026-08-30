(()=>{
'use strict';
function injectAsset(kind, href){
  if(kind==='css'){
    if([...document.querySelectorAll('link[rel="stylesheet"]')].some(x=>x.getAttribute('href')===href)) return;
    const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);
  }else{
    if(document.querySelector(`script[data-void-asset="${href}"]`)) return;
    const s=document.createElement('script');s.src=href;s.defer=true;s.dataset.voidAsset=href;document.head.appendChild(s);
  }
}
function bootAssets(){
  injectAsset('css','/void-glow.css');
  injectAsset('css','/dream-console.css');
  injectAsset('script','/dream-console.js');
}
function enhance(){
  bootAssets();
  document.querySelectorAll('.console').forEach((el)=>{
    if(el.dataset.jtgEnhanced==='1') return;
    el.dataset.jtgEnhanced='1';
    el.classList.add('jtg-console');
    const logs=el.querySelector('.logs');
    if(logs){
      const paint=()=>{
        logs.querySelectorAll(':scope > div').forEach((line)=>{
          const t=(line.textContent||'').toLowerCase();
          line.classList.remove('jtg-warn','jtg-error','jtg-system','jtg-command');
          if(t.includes('error')||t.includes('exception')||t.includes('failed')) line.classList.add('jtg-error');
          else if(t.includes('warn')||t.includes('warning')) line.classList.add('jtg-warn');
          else if(t.startsWith('>')||t.includes('command')) line.classList.add('jtg-command');
          else if(t.includes('[system]')||t.includes('starting ')||t.includes('stopping ')) line.classList.add('jtg-system');
        });
      };
      paint();
      new MutationObserver(paint).observe(logs,{childList:true,subtree:true});
    }
  });
}
new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
enhance();
})();
