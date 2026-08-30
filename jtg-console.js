(()=>{
'use strict';
function enhance(){
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
