import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { loadDB, saveDB, type User } from "./db.js";
import { createToken, hashPassword, verifyPassword, requireAuth } from "./auth.js";
import { archiveServer, installPaper, killServer, logs, paperVersions, sendCommand, serverDir, startServer, stopServer, runtime, type ServerRecord } from "./manager.js";
import { javaInfo, nodeStats, nextFreePort } from "./node.js";
import { pteroRouter } from "./ptero-features.js";

const app = express();
const PORT = Number(process.env.PORT || 6968);
const root = process.cwd();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "25mb" }));

const db = () => loadDB();
function publicUser(u: User) { return { id: u.id, username: u.username, role: u.role, createdAt: u.createdAt }; }
function id() { return crypto.randomUUID(); }
function records(): ServerRecord[] { return (db() as any).servers ?? []; }
function saveRecords(v: ServerRecord[]) { const d = db(); d.servers = v; saveDB(d); }
function record(id: string) { return records().find(s => s.id === id); }
function admin(req: any, res: any) { if (req.user?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; } return true; }

async function ensureAdmin() {
  const d = db();
  const username = process.env.ADMIN_USERNAME || "ishan";
  const password = process.env.ADMIN_PASSWORD || "ishan_1234";
  let u = d.users.find(x => x.role === "admin") || d.users.find(x => x.username.toLowerCase() === username.toLowerCase());
  if (!u) u = { id: id(), username, passwordHash: await hashPassword(password), role: "admin", createdAt: new Date().toISOString() };
  else { u.username = username; u.role = "admin"; u.passwordHash = await hashPassword(password); }
  if (!d.users.includes(u)) d.users.push(u);
  saveDB(d);
}

app.get("/api/health", (_q, res) => res.json({ ok: true, panel: "VOID HOST", port: PORT, hostname: os.hostname(), node: process.version }));
app.get("/api/system", (_q, res) => res.json(nodeStats()));
app.get("/api/config", (_q, res) => res.json({ name: db().settings.name, panelPort: 6969, minecraft: { supported: ["Paper", "Vanilla"] }, features: ["auth", "servers", "nodes", "allocations", "fleet", "suspend", "console", "files", "paper", "backups", "settings", "restart", "startup", "network", "schedules", "databases", "subusers", "activity"] }));

app.post("/api/auth/register", async (req, res) => {
  try { const username = String(req.body.username || "").trim(), password = String(req.body.password || ""); if (username.length < 3 || password.length < 6) return res.status(400).json({ error: "Username must be 3+ chars and password 6+ chars" }); const d = db(); if (d.users.some(u => u.username.toLowerCase() === username.toLowerCase())) return res.status(409).json({ error: "Username already exists" }); const user = { id: id(), username, passwordHash: await hashPassword(password), role: "user", createdAt: new Date().toISOString() } as User; d.users.push(user); saveDB(d); res.json({ token: createToken(user.id), user: publicUser(user) }); } catch (e) { res.status(500).json({ error: String(e) }); }
});
app.post("/api/auth/login", async (req, res) => { const d = db(), u = d.users.find(x => x.username.toLowerCase() === String(req.body.username || "").toLowerCase()); if (!u || !(await verifyPassword(String(req.body.password || ""), u.passwordHash))) return res.status(401).json({ error: "Invalid credentials" }); res.json({ token: createToken(u.id), user: publicUser(u) }); });

app.use("/api/ptero", requireAuth, pteroRouter);
const dist = path.join(root, "dist");
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get("*splat", (_q, res) => res.sendFile(path.join(dist, "index.html"))); }
ensureAdmin().then(() => app.listen(PORT, "0.0.0.0", () => console.log(`VOID HOST backend listening on ${PORT}; panel ${PORT === 6968 ? "frontend via 6969" : PORT}`))).catch(e => { console.error(e); process.exit(1); });
