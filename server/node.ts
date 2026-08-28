import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type Allocation = {
  ip: string;
  port: number;
  assignedTo?: string;
};

export async function javaInfo() {
  try {
    const { stdout, stderr } = await execFileAsync("java", ["-version"]);
    const text = `${stdout}\n${stderr}`.trim();
    const match = text.match(/version\s+"([^"]+)"/i);
    return { installed: true, version: match?.[1] ?? text.split("\n")[0] };
  } catch {
    return { installed: false, version: null };
  }
}

export function nodeStats() {
  const total = os.totalmem();
  const free = os.freemem();
  const cpus = os.cpus();
  const load = os.loadavg();
  const root = process.cwd();
  let diskTotal = 0;
  let diskFree = 0;
  try {
    const stat = fs.statfsSync(root);
    diskTotal = stat.blocks * stat.bsize;
    diskFree = stat.bavail * stat.bsize;
  } catch {}

  return {
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    kernel: os.release(),
    uptime: os.uptime(),
    cpu: { cores: cpus.length, load1: load[0], load5: load[1], load15: load[2] },
    memory: { total, free, used: total - free },
    disk: { total: diskTotal, free: diskFree, used: Math.max(0, diskTotal - diskFree) },
    workdir: path.resolve(root)
  };
}

export function nextFreePort(usedPorts: number[], start = 25565, end = 30000) {
  const used = new Set(usedPorts);
  for (let port = start; port <= end; port++) {
    if (!used.has(port)) return port;
  }
  throw new Error("No free allocation ports remain on this node");
}
