import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(crypto.scrypt),digest=s=>crypto.createHash('sha256').update(s).digest('hex');
export function createAuth({data,key,body,save,error,fetcher=fetch}){
 const file=path.join(data,'account.json'),attempts=new Map();
 const account=()=>{
  if(fs.existsSync(file)){
   try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  }
  return null;
 };
 const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y);};
 const bootstrap=req=>equal((req.headers.authorization||'').replace(/^Bearer /,''),key);
 const token=req=>(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ce_session='))?.slice(11)||'';

 function signSession(){
  const expires=Date.now()+8*3600000;
  const sig=crypto.createHmac('sha256',key).update(String(expires)).digest('hex');
  return `${expires}.${sig}`;
 }
 function verifySession(tok){
  if(!tok||typeof tok!=='string'||!tok.includes('.'))return false;
  const [expStr,sig]=tok.split('.');
  const expires=Number(expStr);
  if(!expires||expires<Date.now())return false;
  const expected=crypto.createHmac('sha256',key).update(expStr).digest('hex');
  const a=Buffer.from(sig||''),b=Buffer.from(expected);
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
 }
 const authorized=req=>{
  if(!account())return bootstrap(req);
  const t=token(req);
  if(t&&verifySession(t))return true;
  return bootstrap(req);
 };
 function session(req,res){
  const signed=signSession();
  const isSecure=!!process.env.VERCEL||req.socket.encrypted;
  res.setHeader('Set-Cookie',`ce_session=${signed}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${isSecure?'; Secure':''}`);
 }
 function limit(req,group,max){const k=group+':'+req.socket.remoteAddress,now=Date.now(),a=(attempts.get(k)||[]).filter(t=>now-t<15*60000);if(a.length>=max)throw error('Too many attempts. Please try again in 15 minutes.',429);a.push(now);attempts.set(k,a);}
 const password=async(p,salt=crypto.randomBytes(16).toString('hex'))=>{if(typeof p!=='string'||p.length<12||p.length>128)throw error('Use a password between 12 and 128 characters.');return {salt,hash:(await scrypt(p,salt,64,{N:32768,maxmem:64*1024*1024})).toString('hex')};};
 const email=v=>String(v||'').trim().toLowerCase();
 const mailSettings=()=>{const f=path.join(data,'notifications.json');return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{};};
 async function handle(req,res,route,json){
  if(!route.startsWith('/api/auth/'))return false;
  if(route==='/api/auth/status'&&req.method==='GET'){const a=account(),m=mailSettings();json({configured:!!a,authenticated:!!a&&authorized(req),canSetup:!a&&bootstrap(req),recoveryAvailable:!!(m.apiKey&&m.from)});return true;}
  if(req.method!=='POST')throw error('Not found.',404);
  if(route==='/api/auth/logout'){
   const isSecure=!!process.env.VERCEL||req.socket.encrypted;
   res.setHeader('Set-Cookie',`ce_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isSecure?'; Secure':''}`);
   json({ok:true});
   return true;
  }
  limit(req,route,route.endsWith('forgot')?3:8);const b=await body(req);
  if(route==='/api/auth/setup'){
   if(account()||!bootstrap(req))throw error('Account setup is not available.',403);
   const address=email(b.email);if(address.length>254||!/^\S+@\S+\.\S+$/.test(address))throw error('Enter a valid email address.');const hashed=await password(b.password);
   if(account())throw error('An account already exists.',409);
   const accData={email:address,...hashed};
   memoryAccount=accData;
   await save(file,accData);
   session(req,res);json({ok:true});return true;
  }
  if(route==='/api/auth/login'){
   const a=account();let hashed;try{hashed=await password(b.password,a?.salt||'00000000000000000000000000000000');}catch{throw error('Email or password is incorrect.',401);}
   if(!a||email(b.email)!==a.email||!equal(hashed.hash,a.hash))throw error('Email or password is incorrect.',401);
   session(req,res);json({ok:true});return true;
  }
  if(route==='/api/auth/forgot'){
   const m=mailSettings();if(!m.apiKey||!m.from)throw error('Password recovery is currently unavailable. Contact the site administrator.',503);
   const a=account();if(a&&email(b.email)===a.email){const reset=crypto.randomBytes(32).toString('hex');a.reset={hash:digest(reset),expires:Date.now()+15*60000};
    memoryAccount=a;
    await save(file,a);
    const link=`${req.socket.encrypted?'https':'http'}://${req.headers.host}/admin#reset=${reset}`;
    try{const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+m.apiKey,'Content-Type':'application/json'},body:JSON.stringify({from:m.from,to:[a.email],subject:'Reset your C&E Admin password',text:`Use this link within 15 minutes to reset your password:\n${link}\nIf you did not request this, ignore this email. For a local website, open the link on the computer running the site.`}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();}catch{const latest=account();if(latest?.reset?.hash===digest(reset)){delete latest.reset;memoryAccount=latest;await save(file,latest);}}
   }json({ok:true,message:'If the email matches your account and delivery succeeds, a reset link will arrive shortly. Check spam too.'});return true;
  }
  if(route==='/api/auth/reset'){
   let a=account();const token=String(b.token||'');if(!a?.reset||a.reset.expires<Date.now()||!equal(a.reset.hash,digest(token)))throw error('This reset link is invalid or expired. Request a new one.');const hashed=await password(b.password);
   a=account();if(!a?.reset||a.reset.expires<Date.now()||!equal(a.reset.hash,digest(token)))throw error('This reset link has already been used or expired.');delete a.reset;Object.assign(a,hashed);
   memoryAccount=a;
   await save(file,a);
   json({ok:true});return true;
  }
  throw error('Not found.',404);
 }
 return {authorized,handle};
}
