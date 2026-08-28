import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { loadDB, saveDB, type User } from "./db.js";
import { createToken, getUserFromRequest, hashPassword, verifyPassword, requireAuth } from "./auth.js";
import { archiveServer, installPaper, killServer, logs, paperVersions, sendCommand, serverDir, serverJar, startServer, stopServer, runtime, type ServerRecord } from "./manager.js";

const app = express(); const PORT = Number(process.env.PORT || 6767); const root = process.cwd();
app.use(cors({ origin: true, credentials: true })); app.use(express.json({ limit: "25mb" }));
const db = () => loadDB();
function publicUser(u: User) { return { id:u.id, username:u.username, role:u.role, createdAt:u.createdAt }; }
function id() { return crypto.randomUUID(); }
function records(): ServerRecord[] { const d=db() as any; return d.servers ?? []; }
function saveRecords(v: ServerRecord[]) { const d=db() as any; d.servers=v; saveDB(d); }
function record(id:string) { return records().find(s=>s.id===id); }

app.get("/api/health", (_q,res)=>res.json({ok:true,panel:"VOID HOST",port:PORT,hostname:os.hostname(),node:process.version}));
app.get("/api/system", (_q,res)=>{const total=os.totalmem(),free=os.freemem();res.json({cpu:os.loadavg()[0],cores:os.cpus().length,ramTotal:total,ramFree:free,ramUsed:total-free,uptime:os.uptime});});
app.get("/api/config", (_q,res)=>res.json({name:db().settings.name,panelPort:PORT,minecraft:{supported:["Paper","Vanilla"]},features:["auth","servers","console","files","paper","backups","settings"]}));

app.post("/api/auth/register", async (req,res)=>{try{const username=String(req.body.username||"").trim();const password=String(req.body.password||"");if(username.length<3||password.length<6)return res.status(400).json({error:"Username must be 3+ chars and password 6+ chars"});const d=db();if(d.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return res.status(409).json({error:"Username already exists"});const user={id:id(),username,passwordHash:await hashPassword(password),role:d.users.length?"user":"admin",createdAt:new Date().toISOString()} as User;d.users.push(user);saveDB(d);res.json({token:createToken(user.id),user:publicUser(user)});}catch(e){res.status(500).json({error:String(e)})}});
app.post("/api/auth/login", async(req,res)=>{const d=db();const u=d.users.find(x=>x.username.toLowerCase()===String(req.body.username||"").toLowerCase());if(!u||!(await verifyPassword(String(req.body.password||""),u.passwordHash)))return res.status(401).json({error:"Invalid credentials"});res.json({token:createToken(u.id),user:publicUser(u)});});
app.get("/api/auth/me",requireAuth,(req,res)=>res.json({user:publicUser((req as any).user)}));

app.get("/api/servers",requireAuth,(_q,res)=>res.json(records().map(s=>({...s,status:runtime(s.id)?"online":s.status}))));
app.post("/api/servers",requireAuth,(req,res)=>{try{const name=String(req.body.name||"Minecraft Server").trim();const version=String(req.body.version||"1.21.8");const memory=Math.max(512,Number(req.body.memory||2048));const used=new Set(records().map(s=>s.port));let port=25565;while(used.has(port))port++;const s:ServerRecord={id:id(),name,software:"Paper",version,port,memory,createdAt:new Date().toISOString(),status:"offline"};fs.mkdirSync(serverDir(s.id),{recursive:true});saveRecords([...records(),s]);res.json(s);}catch(e){res.status(400).json({error:String(e)})}});
app.post("/api/servers/:id/install",requireAuth,async(req,res)=>{try{const s=record(req.params.id);if(!s)return res.status(404).json({error:"Server not found"});const version=String(req.body.version||s.version);const result=await installPaper(s.id,version);s.version=version;saveRecords(records());res.json({ok:true,...result});}catch(e){res.status(400).json({error:String(e)})}});
app.post("/api/servers/:id/start",requireAuth,(req,res)=>{try{const s=record(req.params.id);if(!s)return res.status(404).json({error:"Server not found"});startServer(s);s.status="online";saveRecords(records());res.json({ok:true});}catch(e){res.status(400).json({error:String(e)})}});
app.post("/api/servers/:id/stop",requireAuth,(req,res)=>{const s=record(req.params.id);if(!s)return res.status(404).json({error:"Server not found"});stopServer(s.id);s.status="offline";saveRecords(records());res.json({ok:true});});
app.post("/api/servers/:id/kill",requireAuth,(req,res)=>{const s=record(req.params.id);if(!s)return res.status(404).json({error:"Server not found"});killServer(s.id);s.status="offline";saveRecords(records());res.json({ok:true});});
app.post("/api/servers/:id/command",requireAuth,(req,res)=>{try{sendCommand(req.params.id,String(req.body.command||""));res.json({ok:true});}catch(e){res.status(400).json({error:String(e)})}});
app.get("/api/servers/:id/console",requireAuth,(req,res)=>res.json({logs:logs(req.params.id),running:!!runtime(req.params.id)}));
app.get("/api/paper/versions",requireAuth,async(_q,res)=>{try{res.json({versions:await paperVersions()})}catch(e){res.status(502).json({error:String(e)})}});

function safePath(id:string, rel:string){const base=path.resolve(serverDir(id));const target=path.resolve(base,rel||"");if(target!==base&&!target.startsWith(base+path.sep))throw new Error("Invalid path");return target;}
app.get("/api/servers/:id/files",requireAuth,(req,res)=>{try{const dir=safePath(req.params.id,String(req.query.path||""));const items=fs.readdirSync(dir,{withFileTypes:true}).map(x=>({name:x.name,type:x.isDirectory()?"directory":"file",size:x.isDirectory()?0:fs.statSync(path.join(dir,x.name)).size}));res.json({path:String(req.query.path||""),items})}catch(e){res.status(400).json({error:String(e)})}});
app.get("/api/servers/:id/file",requireAuth,(req,res)=>{try{const p=safePath(req.params.id,String(req.query.path||""));if(!fs.statSync(p).isFile())throw new Error("Not a file");res.type("text/plain").send(fs.readFileSync(p,"utf8"));}catch(e){res.status(400).json({error:String(e)})}});
app.put("/api/servers/:id/file",requireAuth,(req,res)=>{try{const p=safePath(req.params.id,String(req.body.path||""));fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,String(req.body.content||""));res.json({ok:true})}catch(e){res.status(400).json({error:String(e)})}});
app.post("/api/servers/:id/folder",requireAuth,(req,res)=>{try{fs.mkdirSync(safePath(req.params.id,String(req.body.path||"")),{recursive:true});res.json({ok:true})}catch(e){res.status(400).json({error:String(e)})}});
app.delete("/api/servers/:id/file",requireAuth,(req,res)=>{try{const p=safePath(req.params.id,String(req.body.path||""));fs.rmSync(p,{recursive:true,force:true});res.json({ok:true})}catch(e){res.status(400).json({error:String(e)})}});
app.post("/api/servers/:id/backup",requireAuth,async(req,res)=>{try{const out=path.join(root,"data","backups");fs.mkdirSync(out,{recursive:true});const file=path.join(out,`${req.params.id}-${Date.now()}.tar.gz`);await archiveServer(req.params.id,file);res.json({ok:true,file:path.basename(file)})}catch(e){res.status(400).json({error:String(e)})}});

app.get("/api/settings",requireAuth,(_q,res)=>res.json(db().settings));
app.put("/api/settings",requireAuth,(req,res)=>{const d=db();d.settings={...d.settings,...req.body};saveDB(d);res.json(d.settings)});
app.get("/api/users",requireAuth,(req,res)=>{if((req as any).user.role!=="admin")return res.status(403).json({error:"Admin only"});res.json(db().users.map(publicUser));});

const dist=path.join(root,"dist");if(fs.existsSync(dist)){app.use(express.static(dist));app.get("*splat",(_q,res)=>res.sendFile(path.join(dist,"index.html")));}
app.listen(PORT,"0.0.0.0",()=>console.log(`VOID HOST real backend listening on ${PORT}`));
