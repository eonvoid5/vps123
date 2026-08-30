import express from "express";
import os from "node:os";
import fs from "node:fs";
import { loadDB } from "./db.js";
import { nodeStats, javaInfo } from "./node.js";
import { archiveServer, installPaper, killServer, logs, paperVersions, sendCommand, startServer, stopServer, runtime, type ServerRecord } from "./manager.js";

const app = express();
const PORT = Number(process.env.AGENT_PORT || 8080);
const TOKEN = String(process.env.AGENT_TOKEN || "");
app.use(express.json({ limit: "25mb" }));

function auth(req: any, res: any, next: any) {
  if (!TOKEN) return res.status(503).json({ error: "Agent token is not configured" });
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (got !== TOKEN) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function record(id: string): ServerRecord {
  const s = (loadDB() as any).servers?.find((x: any) => x.id === id);
  if (!s) throw new Error("Server not found");
  return s;
}

app.get("/api/agent/health", auth, async (_req, res) => {
  res.json({ ok: true, agent: "VOID HOST AGENT", version: "1.0", hostname: os.hostname(), node: process.version, uptime: os.uptime(), java: await javaInfo(), stats: nodeStats(), capabilities: { power: true, console: true, files: true, backups: true, paperInstaller: true, docker: await dockerAvailable(), sftp: false } });
});

app.get("/api/agent/servers/:id/status", auth, (req, res) => {
  const s = record(req.params.id), rt = runtime(s.id);
  res.json({ id: s.id, online: !!rt, status: rt ? "online" : s.status });
});

app.get("/api/agent/servers/:id/console", auth, (req, res) => {
  const s = record(req.params.id);
  res.json({ logs: logs(s.id), running: !!runtime(s.id) });
});

app.post("/api/agent/servers/:id/power", auth, (req, res) => {
  try {
    const s = record(req.params.id), action = String(req.body.action || "");
    if (action === "start") startServer(s);
    else if (action === "stop") stopServer(s.id);
    else if (action === "kill") killServer(s.id);
    else if (action === "restart") { stopServer(s.id); setTimeout(() => { try { startServer(s); } catch {} }, 1200); }
    else return res.status(400).json({ error: "Unknown power action" });
    res.json({ ok: true, action });
  } catch (e) { res.status(400).json({ error: String(e) }); }
});

app.post("/api/agent/servers/:id/command", auth, (req, res) => {
  try { sendCommand(record(req.params.id).id, String(req.body.command || "")); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: String(e) }); }
});

app.post("/api/agent/servers/:id/install", auth, async (req, res) => {
  try { const s = record(req.params.id), version = String(req.body.version || s.version); res.json({ ok: true, ...(await installPaper(s.id, version, s.port)) }); }
  catch (e) { res.status(400).json({ error: String(e) }); }
});

app.get("/api/agent/paper/versions", auth, async (_req, res) => {
  try { res.json({ versions: await paperVersions() }); }
  catch (e) { res.status(502).json({ error: String(e) }); }
});

app.post("/api/agent/servers/:id/backup", auth, async (req, res) => {
  try {
    const s = record(req.params.id), dir = `${process.cwd()}/data/backups`, output = `${dir}/${s.id}-${Date.now()}.tar.gz`;
    fs.mkdirSync(dir, { recursive: true });
    await archiveServer(s.id, output);
    res.status(201).json({ ok: true, name: output.split("/").pop() });
  } catch (e) { res.status(400).json({ error: String(e) }); }
});

async function dockerAvailable() {
  try {
    const { execFile } = await import("node:child_process");
    await new Promise<void>((resolve, reject) => execFile("docker", ["version", "--format", "{{.Server.Version}}"], { timeout: 3000 }, (err) => err ? reject(err) : resolve()));
    return true;
  } catch { return false; }
}

app.listen(PORT, "0.0.0.0", () => console.log(`VOID HOST AGENT listening on ${PORT}`));
