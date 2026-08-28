import fs from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const SERVERS_DIR = path.resolve(process.cwd(), "data", "servers");
fs.mkdirSync(SERVERS_DIR, { recursive: true });

type Runtime = { process: ReturnType<typeof spawn>; logs: string[]; startedAt: number };
const runtimes = new Map<string, Runtime>();

export type ServerRecord = {
  id: string; name: string; software: "Paper" | "Vanilla"; version: string;
  port: number; memory: number; createdAt: string; status: "online" | "offline" | "starting" | "crashed";
};

const file = (id: string) => path.join(SERVERS_DIR, id);
export function serverDir(id: string) { return file(id); }
export function serverJar(id: string) { return path.join(file(id), "server.jar"); }
export function runtime(id: string) { return runtimes.get(id); }
export function logs(id: string) { return runtimes.get(id)?.logs ?? []; }

function addLog(id: string, text: string) {
  const r = runtimes.get(id); if (!r) return;
  r.logs.push(text); if (r.logs.length > 1000) r.logs.splice(0, r.logs.length - 1000);
}

export async function paperVersions() {
  const r = await fetch("https://api.papermc.io/v2/projects/paper");
  if (!r.ok) throw new Error(`Paper API ${r.status}`);
  const j = await r.json() as { versions: string[] };
  return j.versions.slice(-30).reverse();
}

export async function installPaper(id: string, version: string) {
  const dir = file(id); fs.mkdirSync(dir, { recursive: true });
  const buildsRes = await fetch(`https://api.papermc.io/v2/projects/paper/versions/${encodeURIComponent(version)}/builds`);
  if (!buildsRes.ok) throw new Error(`Paper version ${version} not found`);
  const builds = await buildsRes.json() as { builds: { build: number; downloads: { application: { name: string } } }[] };
  const latest = builds.builds.at(-1);
  if (!latest) throw new Error("No Paper build available");
  const jarName = latest.downloads.application.name;
  const url = `https://api.papermc.io/v2/projects/paper/versions/${encodeURIComponent(version)}/builds/${latest.build}/downloads/${encodeURIComponent(jarName)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Paper download failed: ${response.status}`);
  fs.writeFileSync(serverJar(id), Buffer.from(await response.arrayBuffer()));
  fs.writeFileSync(path.join(dir, "eula.txt"), "eula=true\n");
  fs.writeFileSync(path.join(dir, "server.properties"), `server-port=${portFor(id)}\nmotd=VOID HOST\nview-distance=10\nmax-players=20\n`);
  return { build: latest.build, jar: jarName };
}

function portFor(id: string) {
  const n = parseInt(id.replace(/\D/g, "").slice(-3) || "0", 10);
  return 25565 + (n % 4000);
}

export function startServer(record: ServerRecord) {
  if (runtimes.has(record.id)) return;
  const jar = serverJar(record.id);
  if (!fs.existsSync(jar)) throw new Error("server.jar is missing. Install Paper first.");
  const dir = file(record.id); fs.mkdirSync(dir, { recursive: true });
  const p = spawn("java", [`-Xms128M`, `-Xmx${Math.max(512, record.memory)}M`, "-jar", "server.jar", "--nogui"], { cwd: dir, stdio: ["pipe", "pipe", "pipe"] });
  const r: Runtime = { process: p, logs: [], startedAt: Date.now() }; runtimes.set(record.id, r);
  const onData = (b: Buffer) => b.toString().split(/\r?\n/).filter(Boolean).forEach(x => addLog(record.id, `[${new Date().toLocaleTimeString()}] ${x}`));
  p.stdout.on("data", onData); p.stderr.on("data", onData);
  p.on("exit", code => { addLog(record.id, `[SYSTEM] Process exited with code ${code ?? "unknown"}`); runtimes.delete(record.id); });
  addLog(record.id, `[SYSTEM] Starting ${record.name} on port ${record.port}`);
}

export function sendCommand(id: string, command: string) {
  const r = runtimes.get(id); if (!r) throw new Error("Server is not running");
  r.process.stdin.write(command.trim() + "\n");
}

export function stopServer(id: string) {
  const r = runtimes.get(id); if (!r) return false;
  r.process.stdin.write("stop\n");
  setTimeout(() => { if (runtimes.has(id)) r.process.kill("SIGTERM"); }, 15000);
  return true;
}

export function killServer(id: string) {
  const r = runtimes.get(id); if (!r) return false;
  r.process.kill("SIGKILL"); runtimes.delete(id); return true;
}

export async function archiveServer(id: string, output: string) {
  await execFileAsync("tar", ["-czf", output, "-C", SERVERS_DIR, id]);
  return output;
}
