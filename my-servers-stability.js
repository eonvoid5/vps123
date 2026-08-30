(()=>{
'use strict';
const originalFetch=window.fetch.bind(window);
const cache=new Map();
const TTL=15000;
function key(){return localStorage.getItem('void_token')||'guest'}
function isServersGet(input,init){
  const method=(init?.method|| (input instanceof Request?input.method:'GET') || 'GET').toUpperCase();
  const url=typeof input==='string'?input:(input instanceof Request?input.url:'');
  return method==='GET' && /\/api\/servers(?:\?|$)/.test(new URL(url,location.href).pathname+new URL(url,location.href).search);
}
window.fetch=async function(input,init){
  const res=await originalFetch(input,init);
  if(!isServersGet(input,init)) return res;
  try{
    if(!res.ok) return res;
    const data=await res.clone().json();
    const k=key();
    if(Array.isArray(data) && data.length){
      cache.set(k,{at:Date.now(),data});
      return res;
    }
    const saved=cache.get(k);
    if(Array.isArray(data) && data.length===0 && saved && Date.now()-saved.at<TTL){
      return new Response(JSON.stringify(saved.data),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    }
  }catch{}
  return res;
};
})();
