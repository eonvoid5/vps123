import fs from "node:fs";
import path from "node:path";
const DATA_DIR=path.resolve(process.cwd(),"data"); fs.mkdirSync(DATA_DIR,{recursive:true});
export const DB_FILE=path.join(DATA_DIR,"db.json");
export type User={id:string;username:string;passwordHash:string;role:"admin"|"user";createdAt:string};
export type PanelSettings={name:string;background:string;accent:string;glassOpacity:number;blur:number;theme:"dark"|"light"};
export type Database={users:User[];settings:PanelSettings;servers:any[]};
const defaults:Database={users:[],servers:[],settings:{name:"VOID HOST",background:"",accent:"#22c55e",glassOpacity:.18,blur:18,theme:"dark"}};
export function loadDB():Database{try{if(!fs.existsSync(DB_FILE)){saveDB(defaults);return structuredClone(defaults)}return {...defaults,...JSON.parse(fs.readFileSync(DB_FILE,"utf8"))}}catch{return structuredClone(defaults)}}
export function saveDB(db:Database){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2))}
