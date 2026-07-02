#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolveMultiuserTokens } from "./multiuser-agent-env.mjs";

const required = /^(1|true|yes)$/i.test(String(process.env.ZAKI_ISOLATION_REQUIRED || ""));
const hasTokens = resolveMultiuserTokens().length >= 2;
const hasHireCreds =
  Boolean((process.env.HIRE_USER_A_EMAIL||"").trim()) && Boolean((process.env.HIRE_USER_A_PASSWORD||"").trim()) &&
  Boolean((process.env.HIRE_USER_B_EMAIL||"").trim()) && Boolean((process.env.HIRE_USER_B_PASSWORD||"").trim());
const hasDbUrl = Boolean((process.env.DATABASE_URL||"").trim());

const steps = [
  { name:"agent",    cmd:["node","scripts/multiuser-agent-isolation.mjs"],    ready:hasTokens,    needs:"ZAKI_MULTIUSER_TOKENS (>=2)" },
  { name:"spaces",   cmd:["node","scripts/multiuser-spaces-isolation.mjs"],   ready:hasTokens,    needs:"ZAKI_MULTIUSER_TOKENS (>=2)" },
  { name:"hire",     cmd:["node","scripts/multiuser-hire-isolation.mjs"],     ready:hasHireCreds, needs:"HIRE_USER_A/B_EMAIL + _PASSWORD" },
  { name:"learning", cmd:["node","scripts/multiuser-learning-isolation.mjs"], ready:hasDbUrl,     needs:"DATABASE_URL (+ live BFF)" },
];
function runStep(step){return new Promise((resolve)=>{const t=Date.now();const c=spawn(step.cmd[0],step.cmd.slice(1),{stdio:"inherit",env:process.env});c.on("error",(e)=>resolve({name:step.name,ok:false,code:1,error:String(e),durationMs:Date.now()-t}));c.on("close",(code)=>resolve({name:step.name,ok:code===0,code:code??1,durationMs:Date.now()-t}));});}
const summary=[]; let hardFail=false;
for (const step of steps){
  if(!step.ready){
    if(required){console.error(`[isolation-suite] REQUIRED but missing creds for "${step.name}": needs ${step.needs}`);summary.push({name:step.name,ok:false,skipped:false,reason:`missing ${step.needs}`});hardFail=true;}
    else{console.warn(`[isolation-suite] skipping "${step.name}" (missing ${step.needs}); set ZAKI_ISOLATION_REQUIRED=1 to enforce.`);summary.push({name:step.name,ok:true,skipped:true,reason:`missing ${step.needs}`});}
    continue;
  }
  const r=await runStep(step); summary.push(r); if(!r.ok) hardFail=true;
}
console.log(JSON.stringify({ok:!hardFail,required,summary},null,2));
if(hardFail) process.exit(1);
