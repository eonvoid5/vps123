import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadDB, saveDB } from "./db.js";
import { archiveServer, logs, runtime, sendCommand, startServer, stopServer, killServer, serverDir, type ServerRecord } from "./manager.js";

export const pteroRouter = Router();

const db = () => loadDB();
const records = (): any[] => (db() as any).servers ?? [];
const saveRecords = (servers: any[]) => { const d = db(); d.servers = servers; saveDB(d); };
const findServer = (id: string) => records().find(s => s.id === id);
const isAdmin = (req: any) => req.user?.role === "admin";
const owns = (req: any, s: any) => !!s && (isAdmin(req) || s.ownerId === req.user.id);
const denied = (res: any) => res.status(403).json({ error: "You do not have access to this server" });
const id = () => crypto.randomUUID();

function access(req: any, res: any, next: () => void) {
  const s = findServer(req.params.id);
  if (!owns(req, s)) return denied(res);
  (req as any).pteroServer = s;
  next();
}

pteroRouter.get("/servers/:id/stats", access, (req: any, res) => {
  const s = req.pteroServer;
  const rt = runtime(s.id);
  const startedAt = rt?.startedAt ?? null;
  res.json({ cpu: 0, memory: s.memory, memoryUsed: 0, disk: fs.existsSync(serverDir(s.id)) ? fs.statSync(serverDir(s.id)).size : 0, networkRx: 0, networkTx: 0, uptime: startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0, online: !!rt });
});

pteroRouter.post("/servers/:id/restart", access, (req: any, res) => {
  const s = req.pteroServer;
  if ((s as any).suspended) return res.status(423).json({ error: "Server is suspended" });
  try {
    stopServer(s.id);
    setTimeout(() => { try { startServer(s); s.status = "online"; saveRecords(records()); } catch {} }, 1500);
    s.status = "starting"; saveRecords(records()); res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: String(e) }); }
});

pteroRouter.get("/servers/:id/startup", access, (req: any, res) => {
  const s = req.pteroServer;
  const dir = serverDir(s.id);
  let properties = "";
  try { properties = fs.readFileSync(path.join(dir, "server.properties"), "utf8"); } catch {}
  res.json({ version: s.version, software: s.software, jar: "server.jar", memory: s.memory, port: s.port, command: `java -Xms128M -Xmx${s.memory}M -jar server.jar --nogui`, properties });
});

pteroRouter.put("/servers/:id/startup", access, (req: any, res) => {
  const s = req.pteroServer;
  if (req.body.memory !== undefined) s.memory = Math.max(512, Number(req.body.memory));
  if (req.body.version) s.version = String(req.body.version);
  if (req.body.port) s.port = Number(req.body.port);
  if (typeof req.body.properties === "string") fs.writeFileSync(path.join(serverDir(s.id), "server.properties"), req.body.properties);
  saveRecords(records()); res.json({ ok: true, server: s });
});

pteroRouter.get("/servers/:id/network", access, (req: any, res) => {
  const s = req.pteroServer;
  const allocations = (s.allocations ?? [{ id: s.port, ip: "0.0.0.0", port: s.port, primary: true }]);
  res.json({ allocations, primary: allocations.find((x: any) => x.primary) ?? allocations[0] });
});
pteroRouter.post("/servers/:id/network", access, (req: any, res) => {
  const s = req.pteroServer;
  if (!isAdmin(req)) return res.status(403).json({ error: "Admin only" });
  const port = Number(req.body.port); if (!Number.isInteger(port) || port < 1024 || port > 65535) return res.status(400).json({ error: "Invalid port" });
  s.allocations = [...(s.allocations ?? []), { id: port, ip: String(req.body.ip || "0.0.0.0"), port, primary: !(s.allocations ?? []).length }]; saveRecords(records()); res.json(s.allocations);
});
pteroRouter.delete("/servers/:id/network/:port", access, (req: any, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Admin only" });
  const s = req.pteroServer; const port = Number(req.params.port); s.allocations = (s.allocations ?? []).filter((x: any) => x.port !== port); saveRecords(records()); res.json({ ok: true });
});

pteroRouter.get("/servers/:id/schedules", access, (req: any, res) => res.json(req.pteroServer.schedules ?? []));
pteroRouter.post("/servers/:id/schedules", access, (req: any, res) => {
  const s = req.pteroServer;
  const schedule = { id: id(), name: String(req.body.name || "New schedule"), cron: String(req.body.cron || "0 3 * * *"), action: String(req.body.action || "command"), payload: String(req.body.payload || ""), active: req.body.active !== false, lastRun: null, createdAt: new Date().toISOString() };
  s.schedules = [...(s.schedules ?? []), schedule]; saveRecords(records()); res.json(schedule);
});
pteroRouter.patch("/servers/:id/schedules/:schedule", access, (req: any, res) => {
  const s = req.pteroServer; const x = (s.schedules ?? []).find((v: any) => v.id === req.params.schedule); if (!x) return res.status(404).json({ error: "Schedule not found" }); Object.assign(x, req.body); saveRecords(records()); res.json(x);
});
pteroRouter.delete("/servers/:id/schedules/:schedule", access, (req: any, res) => { const s = req.pteroServer; s.schedules = (s.schedules ?? []).filter((x: any) => x.id !== req.params.schedule); saveRecords(records()); res.json({ ok: true }); });
pteroRouter.post("/servers/:id/schedules/:schedule/run", access, async (req: any, res) => {
  const s = req.pteroServer; const x = (s.schedules ?? []).find((v: any) => v.id === req.params.schedule); if (!x) return res.status(404).json({ error: "Schedule not found" });
  try { if (x.action === "command" && x.payload) sendCommand(s.id, x.payload); else if (x.action === "restart") { stopServer(s.id); setTimeout(() => { try { startServer(s); } catch {} }, 1200); } else if (x.action === "start") startServer(s); else if (x.action === "stop") stopServer(s.id); else if (x.action === "kill") killServer(s.id); else if (x.action === "backup") { const out = path.join(process.cwd(), "data", "backups"); fs.mkdirSync(out, { recursive: true }); await archiveServer(s.id, path.join(out, `${s.id}-${Date.now()}.tar.gz`)); } x.lastRun = new Date().toISOString(); saveRecords(records()); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: String(e) }); }
});

pteroRouter.get("/servers/:id/databases", access, (req: any, res) => res.json(req.pteroServer.databases ?? []));
pteroRouter.post("/servers/:id/databases", access, (req: any, res) => { const s = req.pteroServer; const dbm = { id: id(), name: String(req.body.name || `minecraft_${s.id.slice(0, 6)}`), username: String(req.body.username || `void_${s.id.slice(0, 6)}`), host: "127.0.0.1", port: 3306, status: "metadata-only" }; s.databases = [...(s.databases ?? []), dbm]; saveRecords(records()); res.status(201).json(dbm); });
pteroRouter.delete("/servers/:id/databases/:database", access, (req: any, res) => { const s = req.pteroServer; s.databases = (s.databases ?? []).filter((x: any) => x.id !== req.params.database); saveRecords(records()); res.json({ ok: true }); });

pteroRouter.get("/servers/:id/users", access, (req: any, res) => res.json(req.pteroServer.subusers ?? []));
pteroRouter.post("/servers/:id/users", access, (req: any, res) => { const s = req.pteroServer; const u = { id: id(), username: String(req.body.username || ""), permissions: Array.isArray(req.body.permissions) ? req.body.permissions : ["control.console", "control.start", "control.stop", "file.read"], createdAt: new Date().toISOString() }; if (!u.username) return res.status(400).json({ error: "Username required" }); s.subusers = [...(s.subusers ?? []), u]; saveRecords(records()); res.status(201).json(u); });
pteroRouter.patch("/servers/:id/users/:user", access, (req: any, res) => { const s = req.pteroServer; const u = (s.subusers ?? []).find((x: any) => x.id === req.params.user); if (!u) return res.status(404).json({ error: "User not found" }); if (Array.isArray(req.body.permissions)) u.permissions = req.body.permissions; saveRecords(records()); res.json(u); });
pteroRouter.delete("/servers/:id/users/:user", access, (req: any, res) => { const s = req.pteroServer; s.subusers = (s.subusers ?? []).filter((x: any) => x.id !== req.params.user); saveRecords(records()); res.json({ ok: true }); });

pteroRouter.get("/servers/:id/activity", access, (req: any, res) => { const s = req.pteroServer; const entries = (s.activity ?? []).slice(-100).reverse(); res.json(entries); });
pteroRouter.get("/servers/:id/backups", access, (req: any, res) => { const dir = path.join(process.cwd(), "data", "backups"); fs.mkdirSync(dir, { recursive: true }); const prefix = `${req.pteroServer.id}-`; const items = fs.readdirSync(dir).filter(x => x.startsWith(prefix)).map(name => { const st = fs.statSync(path.join(dir, name)); return { name, size: st.size, createdAt: st.mtime.toISOString() }; }).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); res.json(items); });
