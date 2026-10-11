import {createAuth} from './auth.mjs';
import {createLeads} from './leads.mjs';
import {createEnhancements,validateExtras,indexingAllowed,pageSeo,seoExtras,crawlBody,extraPages} from './enhancements.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const isVercel=!!process.env.VERCEL;
const root=path.dirname(fileURLToPath(import.meta.url)), data=isVercel?'/tmp/ce-data':path.join(root,'data'), pub=path.join(root,'public');
fs.mkdirSync(data,{recursive:true});fs.mkdirSync(path.join(data,'resumes'),{recursive:true});try{try{fs.mkdirSync(path.join(pub,'uploads'),{recursive:true});}catch{}}catch{}
const file=path.join(data,'content.json'), keyfile=path.join(data,'admin-key.txt');
if(!fs.existsSync(file)) fs.copyFileSync(path.join(root,'seed.json'),file);
const key=(process.env.ADMIN_KEY||(fs.existsSync(keyfile)?fs.readFileSync(keyfile,'utf8').trim():'')).trim()||crypto.randomBytes(32).toString('hex');
if(!fs.existsSync(keyfile)) fs.writeFileSync(keyfile,key,{mode:0o600});
const port=Number(process.env.PORT||4173), host=isVercel?'0.0.0.0':'127.0.0.1';
const read=()=>JSON.parse(fs.readFileSync(file,'utf8'));
const save=async(p,value)=>{
 fs.writeFileSync(p+'.tmp',JSON.stringify(value,null,2));fs.renameSync(p+'.tmp',p);
 const dbUrl=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!dbUrl)return;
 try{
  const {neon}=await import('@neondatabase/serverless');
  const sql=neon(dbUrl);
  if(p===file)await sql`INSERT INTO ce_content (key, data, updated_at) VALUES ('main', ${JSON.stringify(value)}::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
  else if(p===path.join(data,'submissions.json'))await Promise.all((value||[]).map(item=>sql`INSERT INTO ce_submissions (id, data, created_at) VALUES (${item.id}, ${JSON.stringify(item)}::jsonb, ${item.created||new Date().toISOString()}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`));
  else if(p===path.join(data,'notifications.json'))await sql`INSERT INTO ce_settings (key, data, updated_at) VALUES ('notifications', ${JSON.stringify(value)}::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
  else if(p===path.join(data,'account.json'))await sql`INSERT INTO ce_settings (key, data, updated_at) VALUES ('account', ${JSON.stringify(value)}::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
 }catch(err){console.error('[DB Save Error]',err.message);}
};
let syncedFromNeon=false;
async function syncFromDb(){
 const dbUrl=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!dbUrl)return;
 if(syncedFromNeon)return;
 try{
  const {neon}=await import('@neondatabase/serverless');
  const sql=neon(dbUrl);
  const contentRows=await sql`SELECT data FROM ce_content WHERE key = 'main'`;
  if(contentRows.length>0&&contentRows[0].data)fs.writeFileSync(file,JSON.stringify(contentRows[0].data,null,2));
  const subRows=await sql`SELECT data FROM ce_submissions ORDER BY created_at DESC`;
  if(subRows.length>0)fs.writeFileSync(path.join(data,'submissions.json'),JSON.stringify(subRows.map(r=>r.data),null,2));
  const setRows=await sql`SELECT data FROM ce_settings WHERE key = 'notifications'`;
  if(setRows.length>0&&setRows[0].data)fs.writeFileSync(path.join(data,'notifications.json'),JSON.stringify(setRows[0].data,null,2));
  const accRows=await sql`SELECT data FROM ce_settings WHERE key = 'account'`;
  if(accRows.length>0&&accRows[0].data)fs.writeFileSync(path.join(data,'account.json'),JSON.stringify(accRows[0].data,null,2));
  syncedFromNeon=true;
 }catch(err){console.error('[DB Sync Error]',err.message);}
}
async function syncAccountFromDb(){
 const dbUrl=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!dbUrl)return;
 try{
  const {neon}=await import('@neondatabase/serverless');
  const sql=neon(dbUrl);
  const accRows=await sql`SELECT data FROM ce_settings WHERE key = 'account'`;
  if(accRows.length>0&&accRows[0].data)fs.writeFileSync(path.join(data,'account.json'),JSON.stringify(accRows[0].data,null,2));
 }catch(err){console.error('[Account Sync Error]',err.message);}
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const rates=new Map();
const sameOrigin=req=>isVercel||!req.headers.origin||[`http://localhost:${port}`,`http://127.0.0.1:${port}`].includes(req.headers.origin);

async function body(req){let length=0,chunks=[];for await(const chunk of req){length+=chunk.length;if(length>8*1024*1024)throw error('File or request is too large.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw error('Please send a valid form.');}}
const safeText=(x,n=5000)=>String(x??'').trim().slice(0,n);
function validateContent(c){
 if(!c||typeof c!=='object'||!c.business?.name)throw error('A business name is required.');
 for(const name of ['services','areas','jobs','testimonials','resources','faqs'])if(!Array.isArray(c[name]))throw error(`Invalid ${name}.`);
 for(const list of [c.services,c.areas,c.resources]){const seen=new Set();for(const i of list){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(i.slug)||seen.has(i.slug))throw error('Each page needs a unique lowercase URL slug with letters, numbers and hyphens.');seen.add(i.slug);}}
 for(const field of ['heroImage','aboutImage','logo']){const v=c.business[field];if(v&&!/^(?:\/(?:assets|uploads)\/[a-zA-Z0-9._-]+|https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\/.*)$/.test(v))throw error('Choose an uploaded image.');}
 for(const k of ['website','maps','facebook','instagram'])if(c.business[k]){try{if(new URL(c.business[k]).protocol!=='https:')throw 0;}catch{throw error(`${k} must be a full https:// address.`);}}
 if(c.business.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.business.email))throw error('Enter a valid business email.');
 if(c.business.analyticsId&&!/^G-[A-Z0-9]+$/.test(c.business.analyticsId))throw error('Enter a Google Analytics ID in G-XXXXXXXXXX format.');
 validateExtras(c);c.business.heroImage=c.media.hero;c.business.aboutImage=c.media.about;
 return c;
}
function metadata(c,url){const defaults={'/':['Home','Compassionate home care designed around your life.'],'/about':['About C&E','Our approach to compassionate care at home.'],'/services':['Our Services','Explore everyday assistance, companionship and family support.'],'/why-choose-us':['Why Choose C&E','Care built around respect, dignity and communication.'],'/how-it-works':['How It Works','A simple path from your first conversation to a personal care plan.'],'/service-areas':['Service Areas','Find out about care in your community.'],'/careers':['Careers','Make a difference with C&E Helping Hands.'],'/resources':['Resources','Practical planning resources for families.'],'/faqs':['Frequently Asked Questions','Answers to questions about starting home care.'],'/contact':['Contact Us','Start a conversation with C&E Helping Hands.'],'/request-care':['Request Care','Tell us about the support you are looking for.'],'/privacy':['Privacy Policy','How this website handles your information.'],'/accessibility':['Accessibility','Our commitment to an accessible website.']};
 for(const [prefix,list] of [['services',c.services.filter(s=>s.enabled&&(c.business.preview||s.confirmed))],['service-areas',c.areas],['resources',c.resources]])for(const item of list)defaults[`/${prefix}/${item.slug}`]=[item.title||item.name,item.description||item.summary];
 return url==='/request-callback'?['Request a Callback','Speak with C&E about home care in your area.']:extraPages[url]||defaults[url];
}
const auth=createAuth({data,key,body,save,error});
const leads=createLeads({data,read,save,body,error});
const handleExtras=createEnhancements({data,read,save,body,jsonError:error});
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'), route=decodeURIComponent(url.pathname).replace(/\/$/,'')||'/';
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: https:; style-src 'self'; script-src 'self' https://www.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 const json=(x,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(x));};
 try{
 await syncFromDb();
 if(!isVercel&&![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host))throw error('Unrecognized host.',403);
 if(!sameOrigin(req))throw error('This request must come from the website.',403);
 if(route==='/api/content'&&req.method==='GET')return json(read());
 if(route.startsWith('/api/auth/'))await syncAccountFromDb();
 if(await auth.handle(req,res,route,json))return;
 if(route.startsWith('/api/admin/')&&!auth.authorized(req))throw error('Please sign in to Admin.',401);
 if(await leads.handle(req,route,json))return;
 if(await handleExtras(req,res,route,json))return;
 if(route==='/api/admin/content'&&req.method==='PUT'){const c=validateContent(await body(req));save(file,c);return json({ok:true});}
 if(route==='/api/admin/content'&&req.method==='GET')return json(read());
 if(route==='/api/admin/submissions'&&req.method==='GET'){const p=path.join(data,'submissions.json');return json(fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):[]);}
 if(route==='/api/admin/upload'&&req.method==='POST'){
  const b=await body(req),buffer=Buffer.from(b.base64||'','base64');if(buffer.length>5*1024*1024)throw error('Choose an image smaller than 5 MB.');let ext;if(buffer.subarray(0,3).equals(Buffer.from([255,216,255])))ext='jpg';else if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';else if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')ext='webp';else throw error('Please upload a JPG, PNG or WebP image.');const name=crypto.randomUUID()+'.'+ext;
  if(process.env.BLOB_READ_WRITE_TOKEN){try{const {put}=await import('@vercel/blob');const blob=await put('uploads/'+name,buffer,{access:'public',contentType:'image/'+(ext==='jpg'?'jpeg':ext)});return json({url:blob.url});}catch(e){console.error('[Blob upload error]',e.message);}}
  fs.writeFileSync(path.join(pub,'uploads',name),buffer);return json({url:'/uploads/'+name});
 }
 if(route.startsWith('/api/admin/resumes/')&&req.method==='GET'){
  const id=route.split('/').at(-1);if(!/^[a-f0-9-]+\.(pdf|docx)$/.test(id))throw error('Not found.',404);const p=path.join(data,'resumes',id);
  if(fs.existsSync(p)){res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="resume.${id.split('.').at(-1)}"`,'Cache-Control':'no-store'});return res.end(fs.readFileSync(p));}
  if(process.env.BLOB_READ_WRITE_TOKEN){try{const {head}=await import('@vercel/blob');const b=await head('resumes/'+id);if(b?.downloadUrl){res.writeHead(302,{Location:b.downloadUrl});return res.end();}}catch{}}
  throw error('Not found.',404);
 }
 if(route==='/api/inquiries'&&req.method==='POST'){
 const b=await body(req);if(b.website)throw error('Unable to submit this form.');
 const now=Date.now(),ip=req.socket.remoteAddress,attempts=(rates.get(ip)||[]).filter(t=>now-t<600000);if(attempts.length>=10)throw error('Too many requests. Please try again in a few minutes.',429);attempts.push(now);rates.set(ip,attempts);
 if(!['care','career'].includes(b.type))throw error('Invalid form.');
 if(!safeText(b.name)||(!safeText(b.email)&&b.callback!=='yes')||!safeText(b.phone))throw error('Name, phone and email are required.');
 if((b.email||b.callback!=='yes')&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))throw error('Please enter a valid email address.');
 if(!/^[+()\d\s.-]{7,30}$/.test(b.phone))throw error('Please enter a valid phone number.');
 if(b.callback==='yes'&&(b.type!=='care'||!safeText(b.city)||!safeText(b.service)||!['Any time during office hours','Morning','Afternoon','Evening'].includes(b.callbackTime)))throw error('Choose your location, service, and preferred callback time.');
 if(b.consent!==true)throw error('Please agree to be contacted about your request.');
 const item={id:crypto.randomUUID(),created:new Date().toISOString(),status:'New',type:b.type};
 for(const k of ['name','phone','email','city','contactMethod','who','service','schedule','start','message','experience','availability','certifications','position','callback','callbackTime'])item[k]=safeText(b[k]);
 if(b.resume&&b.type==='career'){
  const buf=Buffer.from(b.resume.base64||'','base64'),ext=String(b.resume.name).split('.').at(-1).toLowerCase();if(buf.length>5*1024*1024||!buf.length)throw error('Résumé must be smaller than 5 MB.');if(!((ext==='pdf'&&buf.toString('ascii',0,5)==='%PDF-')||(ext==='docx'&&buf[0]===80&&buf[1]===75)))throw error('Please choose a valid PDF or DOCX résumé.');item.resume=item.id+'.'+ext;
  fs.writeFileSync(path.join(data,'resumes',item.resume),buf,{mode:0o600});
  if(process.env.BLOB_READ_WRITE_TOKEN){import('@vercel/blob').then(({put})=>put('resumes/'+item.resume,buf,{access:'public'})).catch(e=>console.error('[Resume Blob error]',e.message));}
 }
 const p=path.join(data,'submissions.json'),items=fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):[];leads.prepare(item);items.unshift(item);save(p,items);void leads.processQueue().catch(()=>{});return json({ok:true,reference:item.id.slice(0,8)},201);
 }
 if(route.startsWith('/api/'))throw error('Not found.',404);
 if(!['GET','HEAD'].includes(req.method))throw error('Method not allowed.',405);
 if(route==='/robots.txt'){const c=read();res.setHeader('Content-Type','text/plain');return res.end(indexingAllowed(c,req)?'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: '+(c.seo.canonicalOrigin||c.business.website).replace(/\/$/,'')+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n');}
 if(route==='/sitemap.xml'){const c=read(),base=(c.seo?.canonicalOrigin||c.business.website||`http://localhost:${port}`).replace(/\/$/,'');const routes=['/','/about','/services','/why-choose-us','/how-it-works','/service-areas','/careers','/resources','/faqs','/contact','/request-care','/request-callback','/privacy','/terms','/cookies','/accessibility','/care-disclaimer',...c.services.filter(i=>i.enabled&&(c.business.preview||i.confirmed)).map(i=>'/services/'+i.slug),...c.areas.map(i=>'/service-areas/'+i.slug),...c.resources.map(i=>'/resources/'+i.slug)];res.setHeader('Content-Type','application/xml');return res.end('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(r=>'<url><loc>'+esc(base+r)+'</loc></url>').join('')+'</urlset>');}
 const candidate=path.resolve(pub,'.'+route);
 if(candidate.startsWith(pub+path.sep)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()){
 const types={'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
 res.setHeader('Content-Type',types[path.extname(candidate)]||'text/plain');return res.end(req.method==='HEAD'?'':fs.readFileSync(candidate));}
 const c=read(),meta=metadata(c,route),admin=route==='/admin';let html=fs.readFileSync(path.join(pub,admin?'admin.html':'index.html'),'utf8');
 const seo=pageSeo(c,route,meta);html=html.replaceAll('{{TITLE}}',esc(seo.title)).replaceAll('{{DESCRIPTION}}',esc(seo.description)).replace('{{EXTRA}}',admin?'':seoExtras(c,route,meta,req)).replace('{{CRAWL_BODY}}',crawlBody(c,route,meta));
 res.writeHead(admin||meta?200:404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?'':html);
 }catch(e){json({error:e.status?e.message:'Something went wrong. Please try again.'},e.status||500);}
});
server.listen(port,host,()=>console.log(`C&E website: http://localhost:${port}\nAdmin: use Open Admin.ps1 in your website folder.`));
