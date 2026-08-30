(()=>{
'use strict';
const CACHE='void_my_servers_cache_v1';
function isServersRequest(input){
  try{const u=typeof input==='string'?input:(input&&input.url)||'';return new URL(u,location.origin).pathname==='/api/servers'}catch{return false}
}
function save(v){try{sessionStorage.setItem(CACHE,JSON.stringify(v))}catch{}}
function load(){try{const v=JSON.parse(sessionStorage.getItem(CACHE)||'null');return Array.isArray(v)?v:null}catch{return null}}
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  if(!isServersRequest(input)) return originalFetch(input,init);
  const response=await originalFetch(input,init);
  if(!response.ok) return response;
  try{
    const data=await response.clone().json();
    if(Array.isArray(data) && data.length>0){ save(data); return response; }
    const cached=load();
    if(cached && cached.length>0){
      return new Response(JSON.stringify(cached),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    }
  }catch{}
  return response;
};
const style=document.createElement('style');
style.textContent=`
.table-row{animation:vhServerIn .42s cubic-bezier(.22,1,.36,1) both;transition:transform .22s ease,box-shadow .22s ease,background .22s ease!important}
.table-row:hover{transform:translateY(-2px) scale(1.002);box-shadow:0 12px 28px rgba(34,197,94,.12)!important}
.table-row:nth-of-type(2){animation-delay:.04s}.table-row:nth-of-type(3){animation-delay:.08s}.table-row:nth-of-type(4){animation-delay:.12s}.table-row:nth-of-type(5){animation-delay:.16s}
@keyframes vhServerIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
`;
document.head.appendChild(style);
})();
