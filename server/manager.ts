import fs from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const SERVERS_DIR = path.resolve(process.cwd(), "data", "servers");
fs.mkdirSync(SERVERS_DIR, { recursive: true });

const PAPER_API = "https://fill.papermc.io/v3";
const PAPER_GRAPHQL = "https://fill.papermc.io/graphql";
const USER_AGENT = "VOID-HOST/1.0 (https://github.com/eonvoid5/vps123)";

type Runtime = { process: ReturnType<typeof spawn>; logs: string[]; startedAt: number };
const runtimes = new Map<string, Runtime>();

export type ServerRecord = { id:string; name:string; software:"Paper"|"Vanilla"; version:string; port:number; memory:number; createdAt:string; status:"online"|"offline"|"starting"|"crashed" };
const file=(id:string)=>path.join(SERVERS_DIR,id);
export function serverDir(id:string){return file(id)}
export function serverJar(id:string){return path.join(file(id),"server.jar")}
export function runtime(id:string){return runtimes.get(id)}
export function logs(id:string){return runtimes.get(id)?.logs??[]}
function addLog(id:string,text:string){const r=runtimes.get(id);if(!r)return;r.logs.push(text);if(r.logs.length>1000)r.logs.splice(0,r.logs.length-1000)}
async function paperJson(url:string){const response=await fetch(url,{headers:{"User-Agent":USER_AGENT,Accept:"application/json"}});const text=await response.text();if(!response.ok)throw new Error(`PaperMC API ${response.status}: ${text.slice(0,180)}`);try{return JSON.parse(text)}catch{throw new Error("PaperMC returned invalid JSON")}}
async function paperGraphql(query:string){const response=await fetch(PAPER_GRAPHQL,{method:"POST",headers:{"User-Agent":USER_AGENT,Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({query})});const text=await response.text();if(!response.ok)throw new Error(`PaperMC GraphQL ${response.status}: ${text.slice(0,180)}`);const data=JSON.parse(text);if(data.errors?.length)throw new Error(`PaperMC GraphQL: ${data.errors[0]?.message||"query failed"}`);return data.data}
function sortVersions(versions:string[]){return [...new Set(versions)].sort((a,b)=>{const av=a.split(".").map(Number),bv=b.split(".").map(Number);for(let i=0;i<Math.max(av.length,bv.length);i++){const d=(bv[i]??0)-(av[i]??0);if(d)return d}return 0})}
export async function paperVersions(){try{const data=await paperJson(`${PAPER_API}/projects/paper`) as {versions?:Record<string,string[]>};const versions=Object.values(data.versions??{}).flat().filter(v=>/^\d+\.\d+(?:\.\d+)?$/.test(v));return sortVersions(versions)}catch(restError){const data=await paperGraphql(`query { project(key: "paper") { versions(first: 100) { edges { node { key } } } } }`);const versions=(data.project?.versions?.edges??[]).map((x:any)=>x.node?.key).filter((v:any):v is string=>!!v&&/^\d+\.\d+(?:\.\d+)?$/.test(v));if(!versions.length)throw restError;return sortVersions(versions)}}
export async function installPaper(id:string,version:string,port?:number){const dir=file(id);fs.mkdirSync(dir,{recursive:true});let stable:any;try{const builds=await paperJson(`${PAPER_API}/projects/paper/versions/${encodeURIComponent(version)}/builds`) as any[];stable=builds.filter(b=>b.channel==="STABLE"&&b.downloads?.["server:default"]?.url).sort((a,b)=>b.id-a.id)[0]}catch{const safeVersion=version.replace(/\\/g,"\\\\").replace(/"/g,'\\"');const data=await paperGraphql(`query { project(key: "paper") { version(key: "${safeVersion}") { builds(first: 50, orderBy: {direction: DESC}) { edges { node { number channel download(key: "server:default") { name url } } } } } } }`);const nodes=data.project?.version?.builds?.edges?.map((x:any)=>x.node).filter(Boolean)??[];const node=nodes.find((x:any)=>x?.channel==="STABLE"&&x?.download?.url);if(node?.number&&node.download?.url&&node.download.name)stable={id:node.number,channel:"STABLE",downloads:{"server:default":{name:node.download.name,url:node.download.url}}}}
if(!stable?.downloads?.["server:default"]?.url)throw new Error(`No stable Paper build is available for Minecraft ${version}`);const download=stable.downloads["server:default"];const response=await fetch(download.url,{headers:{"User-Agent":USER_AGENT,Accept:"application/java-archive,*/*"}});if(!response.ok)throw new Error(`Paper download failed: HTTP ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<100_000)throw new Error("Paper download was unexpectedly small");fs.writeFileSync(serverJar(id),bytes);const chosenPort=port??25565;fs.writeFileSync(path.join(dir,"eula.txt"),"eula=true\n");fs.writeFileSync(path.join(dir,"server.properties"),`server-port=${chosenPort}\nmotd=VOID HOST\nview-distance=10\nmax-players=20\n`);fs.writeFileSync(path.join(dir,"void-host.json"),JSON.stringify({version,build:stable.id,jar:download.name},null,2));return {build:stable.id,jar:download.name,bytes:bytes.length}}
export function startServer(record:ServerRecord){if(runtimes.has(record.id))return;const jar=serverJar(record.id);if(!fs.existsSync(jar))throw new Error("server.jar is missing. Install Paper first.");const dir=file(record.id);fs.mkdirSync(dir,{recursive:true});const p=spawn("java",["-Xms128M",`-Xmx${Math.max(512,record.memory)}M`,"-jar","server.jar","--nogui"],{cwd:dir,stdio:["pipe","pipe","pipe"]});const r:Runtime={process:p,logs:[],startedAt:Date.now()};runtimes.set(record.id,r);const onData=(b:Buffer)=>b.toString().split(/\r?\n/).filter(Boolean).forEach(x=>addLog(record.id,`[${new Date().toLocaleTimeString()}] ${x}`));p.stdout.on("data",onData);p.stderr.on("data",onData);p.on("error",e=>addLog(record.id,`[SYSTEM] Java failed to start: ${e.message}`));p.on("exit",code=>{addLog(record.id,`[SYSTEM] Process exited with code ${code??"unknown"}`);runtimes.delete(record.id)});addLog(record.id,`[SYSTEM] Starting ${record.name} on port ${record.port}`)}
export function sendCommand(id:string,command:string){const r=runtimes.get(id);if(!r||!r.process.stdin)throw new Error("Server is not running");const value=command.trim();if(!value)return;r.process.stdin.write(value+"\n")}
export function stopServer(id:string){const r=runtimes.get(id);if(!r||!r.process.stdin)return false;r.process.stdin.write("stop\n");setTimeout(()=>{const current=runtimes.get(id);if(current===r&&current.process&&current.process.stdin)current.process.kill("SIGTERM")},15000);return true}
export function killServer(id:string){const r=runtimes.get(id);if(!r)return false;r.process.kill("SIGKILL");runtimes.delete(id);return true}
export async function archiveServer(id:string,output:string){await execFileAsync("tar",["-czf",output,"-C",SERVERS_DIR,id]);return output}
