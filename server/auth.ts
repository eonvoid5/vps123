import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type {Request,Response,NextFunction} from "express";
import {loadDB} from "./db.js";
const SECRET=process.env.JWT_SECRET||"void-host-development-secret-change-this";
export const hashPassword=(p:string)=>bcrypt.hash(p,12);
export const verifyPassword=(p:string,h:string)=>bcrypt.compare(p,h);
export const createToken=(userId:string)=>jwt.sign({userId},SECRET,{expiresIn:"7d"});
export function getUserFromRequest(req:Request){const h=req.headers.authorization;if(!h?.startsWith("Bearer "))return null;try{const p=jwt.verify(h.slice(7),SECRET) as {userId:string};return loadDB().users.find(u=>u.id===p.userId)||null}catch{return null}}
export function requireAuth(req:Request,res:Response,next:NextFunction){const u=getUserFromRequest(req);if(!u)return res.status(401).json({error:"Authentication required"});(req as any).user=u;next()}
export const generateId=()=>crypto.randomUUID();
