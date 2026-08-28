import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, ArrowLeft, ArrowRight, Bell, Boxes, Check, ChevronRight, CircleUserRound,
  Cloud, Command, Copy, Cpu, Database, Download, FileArchive, FileCode2, FileText,
  Folder, Gauge, HardDrive, Home, KeyRound, LayoutDashboard, LogIn, Menu, MoreHorizontal,
  Network, Package, Play, Plus, Power, RefreshCw, Search, Server, Settings, Shield,
  Sparkles, Terminal as TerminalIcon, Trash2, Upload, Users, X, Zap
} from "lucide-react";
import "./styles.css";

type Page = "overview" | "nodes" | "servers" | "deploy" | "fleet" | "api" | "backups" | "users" | "settings";
type ServerState = "online" | "offline" | "starting";

type GameServer = {
  id: string; name: string; software: string; version: string; node: string;
  state: ServerState; players: number; maxPlayers: number; cpu: number; ram: number; disk: number;
  port: number; uptime: string;
};

const bg = "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2400&q=85";

const seedServers: GameServer[] = [
  { id:"survival", name:"Survival SMP", software:"Paper", version:"1.21.11", node:"Built-in Node", state:"online", players:32, maxPlayers:100, cpu:21, ram:67, disk:28, port:25565, uptime:"1d 4h 32m" },
  { id:"skyblock", name:"SkyBlock", software:"Paper", version:"1.21.11", node:"Built-in Node", state:"online", players:12, maxPlayers:50, cpu:18, ram:61, disk:21, port:25566, uptime:"23h 17m" },
  { id:"prison", name:"Prison Realm", software:"Paper", version:"1.21.11", node:"Built-in Node", state:"starting", players:0, maxPlayers:100, cpu:12, ram:45, disk:19, port:25567, uptime:"—" },
  { id:"mini", name:"Minigames", software:"Paper", version:"1.21.11", node:"Built-in Node", state:"offline", players:0, maxPlayers:50, cpu:0, ram:0, disk:16, port:25568, uptime:"—" },
];

const logLines = [
  ["[18:16:24]","[Server]","Starting Survival SMP...","info"],
  ["[18:16:24]","[System]","Java 21.0.2 detected","info"],
  ["[18:16:25]","[System]","Loading server files...","info"],
  ["[18:16:27]","[System]","Preparing world 'world'","info"],
  ["[18:16:29]","[Server]","Enabling plugins (24/24)","info"],
  ["[18:16:32]","[Server]","Done (3.42s)! For help, type \"help\"","info"],
  ["[18:16:33]","[User]","Admin joined the game","user"],
  ["[18:16:39]","[User]","Steve joined the game","user"],
  ["[18:16:42]","[User]","Alex joined the game","user"],
  ["[18:16:46]","[Server]","World saved","info"],
  ["[18:16:49]","[Warning]","Ground items will be removed in 60 seconds!","warn"],
  ["[18:17:06]","[User]","Zombie was slain by Steve","user"],
  ["[18:17:10]","[User]","Welcome to Survival SMP!","user"],
];

function App() {
  const [page, setPage] = useState<Page>("overview");
  const [mobile, setMobile] = useState(false);
  const [servers, setServers] = useState(seedServers);
  const [selected, setSelected] = useState<GameServer | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [auth, setAuth] = useState<"login"|"register"|null>(null);

  const filtered = useMemo(() => servers.filter(s => s.name.toLowerCase().includes(search.toLowerCase())), [servers, search]);

  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(""), 2400); };

  const updateState = (id: string, state: ServerState) => {
    setServers(v => v.map(s => s.id === id ? {...s, state, uptime: state === "online" ? "00h 00m" : "—"} : s));
    if (selected?.id === id) setSelected(v => v ? {...v, state} : v);
    flash(state === "online" ? "Server started" : state === "offline" ? "Server stopped" : "Server starting");
  };

  if (auth) return <AuthPage mode={auth} onBack={() => setAuth(null)} onSuccess={() => setAuth(null)} />;

  return (
    <div className="app" style={{"--bg": `url(${bg})`} as React.CSSProperties}>
      <div className="backdrop"/>
      <aside className={"sidebar glass " + (mobile ? "mobile-open" : "")}>
        <div className="brand"><div className="brand-mark"><Boxes size={22}/></div><span>VOID<span> HOST</span></span></div>
        <nav>
          {([
            ["overview","Overview",LayoutDashboard],["nodes","Nodes",Server],["servers","Servers",Boxes],
            ["deploy","Deploy",Plus],["fleet","Fleet",Network],["api","API Keys",KeyRound],
            ["backups","Backups",FileArchive],["users","Users",Users],["settings","Settings",Settings]
          ] as const).map(([key,label,Icon]) => (
            <button key={key} className={"nav-item " + (page===key ? "active" : "")}
              onClick={() => {setPage(key);setSelected(null);setMobile(false)}}>
              <Icon size={18}/><span>{label}</span><ChevronRight size={15} className="nav-arrow"/>
            </button>
          ))}
        </nav>
        <div className="profile glass-soft"><div className="avatar">A</div><div><b>Admin</b><small>Owner</small></div><span className="online-dot"/></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobile(!mobile)}><Menu size={20}/></button>
          <div className="search glass"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search anything..."/><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button className="icon-btn glass" title="System"><Activity size={18}/></button><button className="icon-btn glass" title="Notifications"><Bell size={18}/><i/></button><button className="icon-btn glass" title="Account"><CircleUserRound size={18}/></button></div>
        </header>

        {selected ? (
          <ServerConsole server={selected} onBack={() => setSelected(null)} onState={updateState} flash={flash}/>
        ) : page === "overview" ? (
          <Overview servers={servers} onOpen={s=>setSelected(s)} onNavigate={setPage}/>
        ) : page === "servers" ? (
          <ServersPage servers={filtered} onOpen={s=>setSelected(s)} onCreate={()=>setPage("deploy")} onState={updateState}/>
        ) : (
          <PlaceholderPage page={page} servers={servers} onOpen={s=>setSelected(s)} onNavigate={setPage} flash={flash}/>
        )}
      </main>

      {notice && <div className="toast glass"><Check size={18}/><span>{notice}</span></div>}
      <div className="sr-only" aria-live="polite">{notice}</div>
    </div>
  );
}

function PageTitle({eyebrow,title,sub}:{eyebrow?:string,title:string,sub?:string}) {
  return <div className="page-title">{eyebrow && <span className="eyebrow"><Sparkles size={14}/>{eyebrow}</span>}<h1>{title}</h1>{sub&&<p>{sub}</p>}</div>
}

function Metric({icon:Icon,label,value,meta,accent="green"}:{icon:any,label:string,value:string,meta:string,accent?:string}) {
  return <div className="metric glass card-hover"><div className={"metric-icon "+accent}><Icon size={21}/></div><div><small>{label}</small><strong>{value}</strong><span>{meta}</span></div></div>
}

function Gauge({label,value}:{label:string,value:number}) {
  const deg = Math.min(360, Math.max(0, value*3.6));
  return <div className="gauge-wrap"><span>{label}</span><div className="gauge" style={{"--deg": `${deg}deg`} as React.CSSProperties}><b>{value}%</b></div></div>
}

function Overview({servers,onOpen,onNavigate}:{servers:GameServer[],onOpen:(s:GameServer)=>void,onNavigate:(p:Page)=>void}) {
  const online = servers.filter(s=>s.state==="online").length;
  const players = servers.reduce((a,s)=>a+s.players,0);
  return <div className="content">
    <PageTitle eyebrow="SYSTEM.CORE — ACCESS GRANTED" title="Welcome back, Admin 👋" sub="Here's what's happening with your servers today."/>
    <div className="metrics"><Metric icon={Server} label="NODES" value="1" meta="● Online"/><Metric icon={Boxes} label="SERVERS" value={String(servers.length)} meta={`● ${online} online`} accent="cyan"/><Metric icon={Users} label="PLAYERS" value={String(players)} meta="● All Servers" accent="lime"/><Metric icon={Gauge} label="UPTIME" value="99.98%" meta="● Network" accent="green"/></div>
    <div className="grid-2">
      <section className="panel glass"><div className="panel-head"><h2>SYSTEM LOAD</h2><span className="live-pill"><i/> LIVE</span></div><div className="gauges"><Gauge label="CPU" value={21}/><Gauge label="RAM" value={67}/><Gauge label="DISK" value={28}/></div><MiniChart/></section>
      <section className="panel glass"><div className="panel-head"><h2>ACTIVE SERVERS</h2><button className="ghost-btn" onClick={()=>onNavigate("servers")}>View All</button></div><div className="server-mini-list">{servers.map(s=><button className="server-mini" key={s.id} onClick={()=>onOpen(s)}><span className="cube"><Boxes size={17}/></span><b>{s.name}</b><span className={"status "+s.state}><i/>{s.state}</span><small>{s.players}/{s.maxPlayers}</small></button>)}</div></section>
    </div>
    <div className="grid-2 bottom-grid">
      <section className="panel glass"><div className="panel-head"><h2>RECENT ACTIVITY</h2><span>Just now</span></div><div className="activity">{["Survival SMP started","SkyBlock backup completed","Prison Realm is starting","Minigames stopped"].map((x,i)=><div key={x}><span className={"activity-dot d"+i}/><b>{x}</b><small>{i===0?"Just now":`${i*5}m ago`}</small></div>)}</div></section>
      <section className="panel glass"><div className="panel-head"><h2>RESOURCE USAGE</h2><select><option>This Hour</option><option>Today</option><option>Week</option></select></div><ResourceChart/></section>
    </div>
  </div>
}

function MiniChart() {
  return <svg className="line-chart" viewBox="0 0 600 110" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor="#10f58a"/><stop offset="1" stopColor="#55ffbd"/></linearGradient></defs><path d="M0 80 C45 55 65 98 105 67 S165 45 205 76 S270 55 310 73 S370 95 415 60 S470 44 505 70 S550 82 600 45" fill="none" stroke="url(#g)" strokeWidth="3"/><path d="M0 80 C45 55 65 98 105 67 S165 45 205 76 S270 55 310 73 S370 95 415 60 S470 44 505 70 S550 82 600 45 L600 110 L0 110Z" fill="url(#g)" opacity=".08"/></svg>
}

function ResourceChart() {
  const data = [{x:"18:00",cpu:32,ram:42,disk:28},{x:"18:15",cpu:48,ram:35,disk:42},{x:"18:30",cpu:39,ram:52,disk:45},{x:"18:45",cpu:72,ram:48,disk:38},{x:"19:00",cpu:58,ram:67,disk:46}];
  return <div className="resource-chart"><div className="legend"><span className="l-green">● CPU</span><span className="l-blue">● RAM</span><span className="l-purple">● DISK</span></div><div className="bars">{data.map((d,i)=><div className="bar-col" key={d.x}><div className="bar cpu" style={{height:d.cpu+"%"}}/><div className="bar ram" style={{height:d.ram+"%"}}/><div className="bar disk" style={{height:d.disk+"%"}}/><small>{i%2===0?d.x:""}</small></div>)}</div></div>
}

function ServersPage({servers,onOpen,onCreate,onState}:{servers:GameServer[],onOpen:(s:GameServer)=>void,onCreate:()=>void,onState:(id:string,state:ServerState)=>void}) {
  return <div className="content"><div className="title-row"><PageTitle eyebrow="SERVERS / MANAGE" title="Minecraft Servers" sub="Control your instances, resources and players."/><button className="primary-btn" onClick={onCreate}><Plus size={18}/> Create Server</button></div><section className="table-panel glass"><div className="table-toolbar"><div className="table-search"><Search size={17}/><input placeholder="Search servers..."/></div><span>{servers.length} servers</span></div><div className="table-wrap"><table><thead><tr><th>SERVER</th><th>NODE</th><th>STATUS</th><th>PLAYERS</th><th>UPTIME</th><th>CPU</th><th>RAM</th><th>ACTIONS</th></tr></thead><tbody>{servers.map(s=><tr key={s.id}><td><button className="name-btn" onClick={()=>onOpen(s)}><span className="cube"><Boxes size={16}/></span><b>{s.name}</b><small>{s.software} {s.version}</small></button></td><td>{s.node}</td><td><span className={"status "+s.state}><i/>{s.state}</span></td><td>{s.players}/{s.maxPlayers}</td><td>{s.uptime}</td><td>{s.cpu}%</td><td>{s.ram}%</td><td><div className="row-actions"><button className="tiny-btn" onClick={()=>onState(s.id,s.state==="online"?"offline":"online")}>{s.state==="online"?<Power size={15}/>:<Play size={15}/>}</button><button className="tiny-btn" onClick={()=>onOpen(s)}><TerminalIcon size={15}/></button><button className="tiny-btn"><MoreHorizontal size={15}/></button></div></td></tr>)}</tbody></table></div></section></div>
}

function ServerConsole({server,onBack,onState,flash}:{server:GameServer,onBack:()=>void,onState:(id:string,state:ServerState)=>void,flash:(s:string)=>void}) {
  const [command,setCommand]=useState("");
  const [logs,setLogs]=useState(logLines);
  const send = () => { if(!command.trim()) return; setLogs(v=>[...v,[new Date().toLocaleTimeString(),"[Console]",command,"user"]]); setCommand(""); flash("Command sent"); };
  return <div className="content console-page">
    <div className="server-header"><button className="back-btn glass" onClick={onBack}><ArrowLeft size={18}/></button><div className="server-title"><div className="cube big"><Boxes size={24}/></div><div><h1>{server.name}</h1><span className={"status "+server.state}><i/>{server.state} · {server.software} {server.version}</span></div></div><div className="server-actions"><button className="primary-btn" onClick={()=>onState(server.id,"online")}><Play size={16}/> Start</button><button className="warning-btn" onClick={()=>{onState(server.id,"starting");window.setTimeout(()=>onState(server.id,"online"),900)}}><RefreshCw size={16}/> Restart</button><button className="danger-btn" onClick={()=>onState(server.id,"offline")}><Power size={16}/> Stop</button></div></div>
    <div className="console-layout">
      <aside className="server-nav glass"><button className="selected"><TerminalIcon size={17}/> Console</button><button><Folder size={17}/> Files</button><button><Users size={17}/> Players <em>{server.players}</em></button><button><Package size={17}/> Plugins <em>24</em></button><button><Settings size={17}/> Settings</button><button><FileArchive size={17}/> Backups</button><button><Shield size={17}/> SFTP</button><button><Activity size={17}/> Activity</button></aside>
      <section className="console-panel glass"><div className="console-toolbar"><div><b>CONSOLE</b><span>LIVE LOG STREAM</span></div><div className="console-tools"><button className="tiny-btn" onClick={()=>setLogs([])}>Clear</button><button className="tiny-btn" onClick={()=>setLogs(logLines)}>Reset</button><label>Auto Scroll <input type="checkbox" defaultChecked/></label><button className="tiny-btn"><Search size={15}/></button></div></div><div className="logs">{logs.map((l,i)=><div className="log-line" key={i}><span className="time">{l[0]}</span><span className={"tag "+l[3]}>{l[1]}</span><span>{l[2]}</span></div>)}</div><div className="command-box"><span>&gt;</span><input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a server command..."/><button className="send-btn" onClick={send}><ArrowRight size={18}/></button></div></section>
      <aside className="server-stats glass"><h3>SERVER STATUS</h3><span className={"status "+server.state}><i/>{server.state}</span><div className="stat"><small>UPTIME</small><b>{server.uptime}</b></div><div className="stat"><small>TPS</small><b>{server.state==="online"?"19.98 / 20.0":"—"}</b></div><div className="stat"><small>CPU USAGE</small><b>{server.cpu}%</b><MiniChart/></div><div className="stat"><small>MEMORY USAGE</small><b>{server.ram}%</b><div className="meter"><i style={{width:server.ram+"%"}}/></div></div><div className="stat"><small>DISK USAGE</small><b>{server.disk}%</b><div className="meter"><i style={{width:server.disk+"%"}}/></div></div></aside>
    </div>
  </div>
}

function PlaceholderPage({page,servers,onOpen,onNavigate,flash}:{page:Page,servers:GameServer[],onOpen:(s:GameServer)=>void,onNavigate:(p:Page)=>void,flash:(s:string)=>void}) {
  const titles:Record<Page,string>={nodes:"Nodes",servers:"Servers",deploy:"Deploy",fleet:"Fleet",api:"API Keys",backups:"Backups",users:"Users",settings:"Admin Settings",overview:"Overview"};
  return <div className="content"><PageTitle eyebrow="VOID HOST CONTROL PLANE" title={titles[page]} sub="This module is part of the production foundation and is ready for the next integration pass."/><div className="feature-grid">{["Live telemetry","Glass file manager","Minecraft runtime","Backups & restore","SFTP access","Users & permissions"].map((x,i)=><div className="feature glass card-hover" key={x}><span className="feature-icon"><Zap size={18}/></span><b>{x}</b><small>Architecture reserved · safe to extend</small></div>)}</div><div className="callout glass"><Shield size={20}/><div><b>No fake success states</b><p>Server actions in this first build are isolated to the local UI. The Minecraft process manager will be connected only after the API and security layer are validated.</p></div></div></div>
}

function AuthPage({mode,onBack,onSuccess}:{mode:"login"|"register",onBack:()=>void,onSuccess:()=>void}) {
  const [register,setRegister]=useState(mode==="register");
  return <div className="auth-page" style={{"--bg":`url(${bg})`} as React.CSSProperties}><div className="auth-backdrop"/><button className="back-btn glass auth-back" onClick={onBack}><ArrowLeft size={18}/></button><div className="auth-card glass"><div className="brand centered"><div className="brand-mark"><Boxes size={28}/></div><span>VOID<span> HOST</span></span></div><p className="auth-sub">{register?"Create your account":"Next-gen Minecraft hosting"}</p><div className="form">{register&&<Field icon={CircleUserRound} placeholder="Username"/>}<Field icon={register?CircleUserRound:LogIn} placeholder={register?"Email":"Email or Username"}/><Field icon={KeyRound} placeholder="Password" password/>{register&&<Field icon={KeyRound} placeholder="Confirm Password" password/>}{register&&<label className="check"><input type="checkbox"/> I agree to the <span>Terms of Service</span> & <span>Privacy Policy</span></label>}<button className="primary-btn wide" onClick={onSuccess}>{register?"Create Account":"Sign In"}<ArrowRight size={17}/></button></div><div className="auth-switch">{register?"Already have an account?":"Don't have an account?"} <button onClick={()=>setRegister(!register)}>{register?"Sign in":"Register now"}</button></div></div></div>
}

function Field({icon:Icon,placeholder,password=false}:{icon:any,placeholder:string,password?:boolean}) {
  return <label className="field"><Icon size={17}/><input type={password?"password":"text"} placeholder={placeholder}/>{password&&<Shield size={15}/>}</label>
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
