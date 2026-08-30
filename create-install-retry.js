(()=>{
'use strict';
const orig=window.fetch;
if(!orig||orig.__voidInstallRetry)return;
async function wrapped(input,init={}){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  const method=String(init?.method||((input&&input.method)||'GET')).toUpperCase();
  if(method==='POST' && /\/api\/servers\/[^/]+\/install(?:\?|$)/.test(url)){
    for(let attempt=0;attempt<4;attempt++){
      const res=await orig(input,init);
      if(res.ok||res.status!==404)return res;
      let msg='';try{const clone=res.clone();const d=await clone.json();msg=String(d?.error||'')}catch{}
      if(!/server not found/i.test(msg))return res;
      await new Promise(r=>setTimeout(r,250*(attempt+1)));
    }
  }
  return orig(input,init);
}
wrapped.__voidInstallRetry=true;
window.fetch=wrapped;
})();