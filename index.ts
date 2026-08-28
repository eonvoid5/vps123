import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const ROOT_DIR = process.cwd();
const root = ROOT_DIR;
const app = express();
const PORT = Number(process.env.PORT || 6767);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });

function safeRead(name: string, fallback: unknown) {
  const file = path.join(dataDir, name);
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    panel: "VOID HOST",
    port: PORT,
    hostname: os.hostname(),
    platform: process.platform,
    node: process.version,
    memory: process.memoryUsage().rss
  });
});

app.get("/api/system", (_req, res) => {
  const total = os.totalmem();
  const free = os.freemem();
  res.json({
    cpu: os.loadavg()[0],
    cores: os.cpus().length,
    ramTotal: total,
    ramFree: free,
    ramUsed: total - free,
    uptime: os.uptime()
  });
});

app.get("/api/servers", (_req, res) => {
  res.json(safeRead("servers.json", []));
});

app.get("/api/config", (_req, res) => {
  res.json({
    name: "VOID HOST",
    panelPort: PORT,
    minecraft: { supported: ["Paper", "Vanilla", "Fabric", "Forge"] },
    features: ["console", "files", "players", "plugins", "backups", "sftp", "sub-users"]
  });
});

// Static production build
const dist = path.join(root, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*splat", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VOID HOST panel running on port ${PORT}`);
});