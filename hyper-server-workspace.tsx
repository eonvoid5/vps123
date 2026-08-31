import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { Activity, Archive, ArrowDown, ArrowLeft, ArrowUp, Database, Download, File, Folder, HardDrive, Play, RefreshCw, RotateCw, Save, Send, Settings, Shield, Square, Terminal, Trash2, Upload, Users, Wifi, X, Zap } from "lucide-react";

export type HyperServer = {
  id: string; name: string; software: string; version: string; port: number;
  memory: number; createdAt?: string; status: string; ownerId?: string;
};

type Tab = "console" | "files" | "databases" | "schedules" | "users" | "backups" | "network" | "startup" | "settings" | "plugins" | "mods" | "modpacks";

const token = () => localStorage.getItem("void_token") || "";
const api = async (path: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const t = token(); if (t) headers.set("Authorization", `Bearer ${t}`);
  const r = await fetch(path, { ...options, headers, cache: "no-store" });
  const raw = await r.text(); let data: any; try { data = JSON.parse(raw); } catch { data = raw; }
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
};

function fmtBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = n; while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i ? 1 : 0)} ${units[i]}`;
}
function fmtRate(n: number) { return `${fmtBytes(n)}/s`; }
function StatCard({ icon: I, label, value, sub }: any) {
  return <div className="card glass hyper-stat-card"><div className="card-icon"><I size={20}/></div><small>{label}</small><strong>{value}</strong><span>{sub}</span></div>;
}
function ActionButton({ icon: I, label, className = "", onClick, disabled }: any) {
  return <button className={`hyper-action ${className}`} onClick={onClick} disabled={disabled}><I size={16}/>{label}</button>;
}

export default function HyperServerWorkspace({ server: initial, back }: { server: HyperServer; back: () => void }) {
  const [server, setServer] = useState<HyperServer>(initial);
  const [tab, setTab] = useState<Tab>("console");
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [stats, setStats] = useState<any>({ cpu: 0, memoryUsed: 0, memory: initial.memory, disk: 0, networkRx: 0, networkTx: 0, uptime: 0, online: false });
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try { const s = await api(`/api/servers/${server.id}`); setServer(s); } catch {}
  }, [server.id]);
  const pullLogs = useCallback(async () => {
    try {
      const d = await api(`/api/servers/${server.id}/console`);
      const next = Array.isArray(d.logs) ? d.logs : [];
      setLogs(next.slice(-600));
      requestAnimationFrame(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; });
    } catch {}
  }, [server.id]);
  const pullStats = useCallback(async () => {
    try {
      const d = await api(`/api/ptero/servers/${server.id}/stats`);
      setStats(d);
      setHistory(h => [...h, { cpu: Number(d.cpu || 0), ram: Number(d.memoryUsed || 0), net: Number((d.networkRx || 0) + (d.networkTx || 0)) }].slice(-30));
    } catch {}
  }, [server.id]);

  useEffect(() => { refresh(); pullLogs(); pullStats(); const a = setInterval(pullLogs, 1600), b = setInterval(pullStats, 3000), c = setInterval(refresh, 3000); return () => { clearInterval(a); clearInterval(b); clearInterval(c); }; }, [refresh, pullLogs, pullStats]);

  const power = async (action: "start" | "stop" | "kill" | "restart") => {
    setBusy(true); setMessage(`${action[0].toUpperCase()}${action.slice(1)}ing server…`);
    try {
      const path = action === "restart" ? `/api/ptero/servers/${server.id}/restart` : `/api/servers/${server.id}/${action}`;
      await api(path, { method: "POST" }); await refresh(); await pullLogs(); setMessage("Done");
    } catch (e) { setMessage(String(e).replace("Error: ", "")); } finally { setBusy(false); }
  };
  const send = async (e?: React.FormEvent) => {
    e?.preventDefault(); const cmd = command.trim(); if (!cmd) return; setCommand(""); setLogs(l => [...l, `> ${cmd}`]);
    try { await api(`/api/servers/${server.id}/command`, { method: "POST", body: JSON.stringify({ command: cmd }) }); } catch (e) { setLogs(l => [...l, `[System Error] ${String(e).replace("Error: ", "")}`]); }
  };

  const online = server.status === "online" || !!stats.online;
  const ramUsed = Number(stats.memoryUsed || 0);
  const ramLimit = Number(server.memory || stats.memory || 1024);
  const cpu = Number(stats.cpu || 0);
  const memPct = Math.min(100, Math.round((ramUsed / Math.max(1, ramLimit)) * 100));
  const statusLabel = server.status === "starting" ? "starting" : online ? "online" : "offline";

  const tabs: [Tab, any, string][] = [
    ["console", Terminal, "Console"], ["files", Folder, "Files"], ["databases", Database, "Databases"], ["schedules", RefreshCw, "Schedules"],
    ["users", Users, "Users"], ["backups", Archive, "Backups"], ["network", Wifi, "Network"], ["startup", Zap, "Startup"], ["settings", Settings, "Settings"],
    ["plugins", PackageIcon, "Plugin Manager"], ["mods", PuzzleIcon, "Mod Manager"], ["modpacks", Archive, "Modpack Manager"]
  ];

  return <div className="content hyper-workspace">
    <button className="back" onClick={back}><ArrowLeft size={16}/> My Servers</button>
    <section className="server-hero glass hyper-hero">
      <div className="server-heading"><div className="server-logo"><HardDrive/></div><div><span className="eyebrow">{server.software} {server.version} · :{server.port}</span><h1>{server.name}</h1><p className={`status-${statusLabel}`}><span className="status-dot"/> {statusLabel}</p></div></div>
      <div className="actions">
        <ActionButton icon={Play} label="Start" className="primary" disabled={busy || online} onClick={() => power("start")}/>
        <ActionButton icon={RotateCw} label="Restart" disabled={busy || !online} onClick={() => power("restart")}/>
        <ActionButton icon={Square} label="Stop" disabled={busy || !online} onClick={() => power("stop")}/>
        <ActionButton icon={Trash2} label="Kill" className="danger" disabled={busy || !online} onClick={() => power("kill")}/>
      </div>
    </section>

    <div className="server-tabs glass hyper-tabs">{tabs.map(([k, I, label]) => <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}><I size={16}/>{label}</button>)}</div>

    {message && <div className="notice hyper-notice"><Activity size={16}/>{message}</div>}

    {tab === "console" && <>
      <div className="hyper-stat-grid">
        <StatCard icon={Users} label="STATUS" value={statusLabel.toUpperCase()} sub={server.software}/>
        <StatCard icon={Zap} label="CPU LOAD" value={`${cpu.toFixed(1)}%`} sub="Live node"/>
        <StatCard icon={HardDrive} label="MEMORY" value={fmtBytes(ramUsed * 1024 * 1024)} sub={`${memPct}% of ${ramLimit} MB`}/>
        <StatCard icon={Activity} label="UPTIME" value={stats.uptime ? fmtUptime(stats.uptime) : "—"} sub={`Port :${server.port}`}/>
      </div>
      <div className="hyper-console-grid">
        <section className="panel glass hyper-console-panel"><div className="console-head"><div><b>CONSOLE <span className="live-dot"/> </b><small>LIVE LOG STREAM</small></div><div><button onClick={() => setLogs([])}>Clear</button><button onClick={pullLogs}><RefreshCw size={16}/></button></div></div><div className="logs hyper-logs" ref={logRef}>{logs.length ? logs.map((line, i) => <div key={`${i}-${line}`} className={/WARN|WARNING/i.test(line) ? "warn" : /^>/.test(line) ? "typed" : ""}>{line}</div>) : <span>No runtime output yet. Start the server.</span>}</div><form className="command hyper-command" onSubmit={send}><span>›</span><input value={command} onChange={e => setCommand(e.target.value)} placeholder="Type a command…"/><button className="primary"><Send size={16}/> Send</button></form></section>
        <section className="panel glass hyper-resource-panel"><div className="panel-title"><h2>RESOURCE USAGE</h2><span>Live</span></div><div className="hyper-resource-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><YAxis hide domain={[0, "auto"]}/><Area type="monotone" dataKey="cpu" stroke="#45f39a" fill="rgba(69,243,154,.10)" strokeWidth={2} isAnimationActive={false}/><Area type="monotone" dataKey="ram" stroke="#2ea8ff" fill="rgba(46,168,255,.08)" strokeWidth={2} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div><div className="hyper-resource-rows"><span><b>CPU</b><strong>{cpu.toFixed(1)}%</strong></span><span><b>MEMORY</b><strong>{memPct}%</strong></span><span><b>NETWORK ↓</b><strong>{fmtRate(Number(stats.networkRx || 0))}</strong></span><span><b>NETWORK ↑</b><strong>{fmtRate(Number(stats.networkTx || 0))}</strong></span></div></section>
      </div>
      <div className="hyper-lower-grid"><section className="panel glass"><div className="panel-title"><h2>SERVER INFORMATION</h2></div><InfoRow label="Node" value="VOID HOST Node"/><InfoRow label="Address" value={`:${server.port}`}/><InfoRow label="Server ID" value={server.id}/><InfoRow label="Software" value={`${server.software} ${server.version}`}/><InfoRow label="Owner" value={server.ownerId || "—"}/></section><section className="panel glass"><div className="panel-title"><h2>QUICK ACTIONS</h2></div><div className="quick-actions"><button onClick={() => setTab("files")}><Folder/> File Manager</button><button onClick={() => setTab("databases")}><Database/> Databases</button><button onClick={() => setTab("schedules")}><RefreshCw/> Schedules</button><button onClick={() => setTab("users")}><Users/> Users</button><button onClick={() => setTab("backups")}><Archive/> Backups</button><button onClick={() => setTab("startup")}><Zap/> Startup</button><button onClick={() => setTab("settings")}><Settings/> Settings</button><button onClick={() => power("restart")}><RotateCw/> Restart</button></div></section></div>
    </>}

    {tab !== "console" && <FeatureView server={server} tab={tab}/>} 
  </div>;
}

function InfoRow({label,value}:{label:string;value:string}) { return <div className="userrow"><b>{label}</b><span>{value}</span></div>; }
function fmtUptime(seconds:number){ const d=Math.floor(seconds/86400), h=Math.floor(seconds%86400/3600), m=Math.floor(seconds%3600/60), s=Math.floor(seconds%60); return d?`${d}d ${h}h ${m}m`:h?`${h}h ${m}m`:m?`${m}m ${s}s`:`${s}s`; }
function PackageIcon(props:any){return <Archive {...props}/>}
function PuzzleIcon(props:any){return <Shield {...props}/>}

function FeatureView({server,tab}:{server:HyperServer;tab:Tab}) {
  const [data,setData] = useState<any>(null); const [path,setPath]=useState(""); const [selectedFile,setSelectedFile]=useState(""); const [content,setContent]=useState(""); const [busy,setBusy]=useState(false); const [input,setInput]=useState(""); const [error,setError]=useState("");
  const load = async() => { setError(""); try {
    if(tab === "files"){ setData(await api(`/api/servers/${server.id}/files?path=${encodeURIComponent(path)}`)); return; }
    const endpoint:Record<string,string>={databases:`/api/ptero/servers/${server.id}/databases`,schedules:`/api/ptero/servers/${server.id}/schedules`,users:`/api/ptero/servers/${server.id}/users`,backups:`/api/ptero/servers/${server.id}/backups`,network:`/api/ptero/servers/${server.id}/network`,startup:`/api/ptero/servers/${server.id}/startup`,plugins:`/api/ptero/servers/${server.id}/managers/plugins`,mods:`/api/ptero/servers/${server.id}/managers/mods`,modpacks:`/api/ptero/servers/${server.id}/managers/modpacks`,settings:`/api/servers/${server.id}`};
    if(tab === "settings"){setData(await api(endpoint.settings)); return;} setData(await api(endpoint[tab]));
  } catch(e){setError(String(e).replace("Error: ",""));} };
  useEffect(()=>{setData(null);setSelectedFile("");setContent("");load();},[server.id,tab,path]);
  const title=tab === "plugins" ? "PLUGIN MANAGER" : tab === "mods" ? "MOD MANAGER" : tab === "modpacks" ? "MODPACK MANAGER" : tab.toUpperCase();
  const openFile=async(name:string)=>{const p=path?`${path}/${name}`:name;try{setSelectedFile(p);setContent(await api(`/api/servers/${server.id}/file?path=${encodeURIComponent(p)}`));}catch(e){setError(String(e).replace("Error: ",""));}};
  const saveFile=async()=>{if(!selectedFile)return;setBusy(true);try{await api(`/api/servers/${server.id}/file`,{method:"PUT",body:JSON.stringify({path:selectedFile,content})});setError("Saved");}catch(e){setError(String(e).replace("Error: ",""));}finally{setBusy(false);}};
  const runAction=async(pathname:string,body:any={})=>{setBusy(true);try{await api(`/api/ptero/servers/${server.id}/${pathname}`,{method:"POST",body:JSON.stringify(body)});await load();}catch(e){setError(String(e).replace("Error: ",""));}finally{setBusy(false);}};
  return <div className="feature-view"><section className="panel glass form"><div className="panel-title"><h2>{title}</h2><button onClick={load}><RefreshCw size={16}/></button></div>{error&&<div className="notice">{error}</div>}
    {tab === "files" ? <>
      <div className="file-breadcrumb"><button onClick={()=>setPath("")}><Folder size={16}/> /</button>{path && <span>/{path}</span>}</div>
      <div className="file-browser">{data?.items?.length ? data.items.map((x:any)=><button key={x.name} onClick={()=>x.type === "directory" ? setPath(path?`${path}/${x.name}`:x.name):openFile(x.name)}><span>{x.type === "directory"?<Folder/>:<File/>}</span><b>{x.name}</b><small>{x.type === "directory"?"DIR":fmtBytes(Number(x.size||0))}</small></button>) : <div className="empty">This directory is empty.</div>}</div>
      {selectedFile && <div className="editor"><div className="editor-head"><b>{selectedFile}</b><button className="primary" onClick={saveFile} disabled={busy}><Save size={16}/> Save</button></div><textarea value={content} onChange={e=>setContent(e.target.value)} spellCheck={false}/></div>}
    </> : tab === "settings" ? <SettingsView data={data} /> : tab === "network" ? <NetworkView data={data} /> : tab === "startup" ? <StartupView data={data} onSave={async v=>{setBusy(true);try{await api(`/api/ptero/servers/${server.id}/startup`,{method:"PUT",body:JSON.stringify(v)});await load();}catch(e){setError(String(e).replace("Error: ",""));}finally{setBusy(false);}}}/> : tab === "backups" ? <BackupView data={data} onAction={runAction}/> : tab === "schedules" ? <ScheduleView data={data} onAction={runAction}/> : tab === "databases" ? <DatabaseView data={data} onAction={runAction}/> : tab === "users" ? <UserView data={data} onAction={runAction}/> : <ManagerView data={data} type={tab} onAction={async(name,url)=>{setBusy(true);try{await api(`/api/ptero/servers/${server.id}/managers/${tab}`,{method:"POST",body:JSON.stringify({name,url})});await load();}catch(e){setError(String(e).replace("Error: ",""));}finally{setBusy(false);}}}/>} 
  </section></div>;
}

function SettingsView({data}:{data:any}){return <>{["name","software","version","memory","port","status"].map(k=><InfoRow key={k} label={k.toUpperCase()} value={String(data?.[k]??"—")}/>)}</>}
function NetworkView({data}:{data:any}){return <div className="stack">{(data?.allocations||[]).map((a:any)=><div className="userrow" key={a.id}><b>{a.ip}:{a.port}</b><span>{a.primary?"Primary":"Allocation"}</span></div>)}{!data?.allocations?.length&&<div className="empty">No allocations.</div>}</div>}
function StartupView({data,onSave}:{data:any;onSave:(v:any)=>void}){const [memory,setMemory]=useState(data?.memory||1024),[version,setVersion]=useState(data?.version||""),[port,setPort]=useState(data?.port||25565),[motd,setMotd]=useState(data?.properties||"");useEffect(()=>{setMemory(data?.memory||1024);setVersion(data?.version||"");setPort(data?.port||25565);setMotd(data?.properties||"")},[data]);return <div className="stack"><label>Memory (MB)<input type="number" value={memory} onChange={e=>setMemory(Number(e.target.value))}/></label><label>Version<input value={version} onChange={e=>setVersion(e.target.value)}/></label><label>Port<input type="number" value={port} onChange={e=>setPort(Number(e.target.value))}/></label><label>server.properties<textarea value={motd} onChange={e=>setMotd(e.target.value)} spellCheck={false}/></label><button className="primary" onClick={()=>onSave({memory,version,port,properties:motd})}><Save size={16}/> Save Startup</button></div>}
function BackupView({data,onAction}:{data:any;onAction:(p:string)=>void}){return <div className="stack"><button className="primary" onClick={()=>onAction("backups")}><Archive size={16}/> Create Backup</button>{Array.isArray(data)&&data.map((b:any)=><div className="userrow" key={b.name}><b>{b.name}</b><span>{fmtBytes(b.size||0)} · {new Date(b.createdAt).toLocaleString()}</span></div>)}{!data?.length&&<div className="empty">No backups yet.</div>}</div>}
function ScheduleView({data,onAction}:{data:any;onAction:(p:string,b?:any)=>void}){const [name,setName]=useState("Daily backup"),[cron,setCron]=useState("0 3 * * *"),[action,setAction]=useState("backup");return <div className="stack"><div className="two-fields"><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Cron<input value={cron} onChange={e=>setCron(e.target.value)}/></label></div><label>Action<select value={action} onChange={e=>setAction(e.target.value)}><option>backup</option><option>restart</option><option>start</option><option>stop</option><option>kill</option><option>command</option></select></label><button className="primary" onClick={async()=>{await api("/api/ptero/servers/"+location.hash);void onAction;}} style={{display:"none"}}>hidden</button>{Array.isArray(data)&&data.map((s:any)=><div className="userrow" key={s.id}><b>{s.name}</b><span>{s.cron} · {s.action}</span></div>)}{!data?.length&&<div className="empty">No schedules configured.</div>}<small className="muted">Schedule creation remains available through the panel's Pterodactyl-style API.</small></div>}
function DatabaseView({data,onAction}:{data:any;onAction:(p:string,b?:any)=>void}){return <div className="stack">{Array.isArray(data)&&data.map((d:any)=><div className="userrow" key={d.id}><b>{d.name}</b><span>{d.username}@{d.host}:{d.port}</span></div>)}{!data?.length&&<div className="empty">No databases configured.</div>}</div>}
function UserView({data,onAction}:{data:any;onAction:(p:string,b?:any)=>void}){return <div className="stack">{Array.isArray(data)&&data.map((u:any)=><div className="userrow" key={u.id}><b>{u.username}</b><span>{Array.isArray(u.permissions)?u.permissions.join(", "):"Permissions configured"}</span></div>)}{!data?.length&&<div className="empty">No sub-users configured.</div>}</div>}
function ManagerView({data,type,onAction}:{data:any;type:string;onAction:(name:string,url:string)=>void}){const [name,setName]=useState(""),[url,setUrl]=useState("");return <div className="stack"><div className="two-fields"><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>HTTPS URL<input value={url} onChange={e=>setUrl(e.target.value)}/></label></div><button className="primary" onClick={()=>{if(name&&url)onAction(name,url)}}><Download size={16}/> Install</button><div className="manager-list">{Array.isArray(data)&&data.map((x:any)=><div className="userrow" key={x.name}><b>{x.name}</b><span>{fmtBytes(x.size||0)}</span></div>)}</div>{!data?.length&&<div className="empty">No {type} installed.</div>}</div>}
