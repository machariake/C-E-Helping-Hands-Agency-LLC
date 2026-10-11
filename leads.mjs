import fs from 'node:fs';
import path from 'node:path';
export const leadStatuses=['New','Contacted','Consultation scheduled','Client gained','Closed'];
export function createLeads({data,read,save,body,error,fetcher=fetch}){
 const settingsPath=path.join(data,'notifications.json'),recordsPath=path.join(data,'submissions.json');
 const settings=()=>fs.existsSync(settingsPath)?JSON.parse(fs.readFileSync(settingsPath,'utf8')):{enabled:false,acknowledge:false,from:'',to:'',apiKey:''};
 const records=()=>fs.existsSync(recordsPath)?JSON.parse(fs.readFileSync(recordsPath,'utf8')):[];
 const email=v=>typeof v==='string'&&v.length<255&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);
 const ready=s=>s.enabled&&s.apiKey&&email(s.from)&&email(s.to);
 const update=(id,fn)=>{const list=records(),item=list.find(i=>i.id===id);if(item){fn(item);save(recordsPath,list);}};
 function prepare(item){const s=settings();item.notifications={team:{state:ready(s)?'pending':'not configured',attempts:0}};if(item.email&&s.acknowledge&&ready(s))item.notifications.receipt={state:'pending',attempts:0};}
 let busy=false;
 async function processQueue(){if(busy)return;busy=true;try{
  const s=settings();if(!ready(s))return;
  for(const item of records())for(const kind of ['team','receipt']){
   const job=item.notifications?.[kind];if(!job||job.state!=='pending'||(job.nextAttempt&&Date.parse(job.nextAttempt)>Date.now()))continue;
   if(Date.now()-Date.parse(item.created)>23*3600000){update(item.id,i=>{i.notifications[kind].state='expired';});continue;}
   const attempt=(job.attempts||0)+1;
   update(item.id,i=>{i.notifications[kind].attempts=attempt;});
   const ref=item.id.slice(0,8),business=read().business;
   const payload={from:s.from,to:[kind==='team'?s.to:item.email],subject:kind==='team'?`New ${item.type==='career'?'application':'care inquiry'} — ${ref}`:`Your request was received — ${ref}`,text:kind==='team'?`A new ${item.type==='career'?'application':'care inquiry'} is waiting in the C&E website Admin inbox.\nReference: ${ref}\nOpen your website Admin to review and follow up. Contact details and form contents are kept in Admin.`:`Thank you for contacting ${business.name}. Your request was received.\nReference: ${ref}\nOur team will review it and contact you. Your preferred time is a request, not a confirmed appointment.\nFor questions, call ${business.phone}. This inbox message is not an emergency service.`};
   try{const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+s.apiKey,'Content-Type':'application/json','Idempotency-Key':`ce-${item.id}-${kind}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Email provider did not accept this message.');const j=await r.json();if(!j.id)throw Error('Email provider did not confirm acceptance.');update(item.id,i=>{Object.assign(i.notifications[kind],{state:'accepted',acceptedAt:new Date().toISOString(),providerId:j.id});});}
   catch{update(item.id,i=>{Object.assign(i.notifications[kind],{state:attempt>=3?'failed':'pending',nextAttempt:new Date(Date.now()+attempt*60000).toISOString()});});}
  }
 }finally{busy=false;}}
 async function handle(req,route,json){
  if(route==='/api/admin/notifications'&&req.method==='GET'){const s=settings();json({enabled:s.enabled,acknowledge:s.acknowledge,from:s.from,to:s.to,configured:!!s.apiKey});return true;}
  if(route==='/api/admin/notifications'&&req.method==='PUT'){
   const b=await body(req),s=settings();for(const k of ['from','to']){const v=String(b[k]||'').trim();if(v&&!email(v))throw error('Enter a valid sender and recipient email address.');s[k]=v;}
   if(b.clearKey)s.apiKey='';else if(b.apiKey){if(typeof b.apiKey!=='string'||b.apiKey.length>500||/[\s]/.test(b.apiKey))throw error('Enter a valid API key.');s.apiKey=b.apiKey;}
   s.enabled=b.enabled===true;s.acknowledge=b.acknowledge===true;if(s.enabled&&!ready(s))throw error('Add your API key, verified sender, and team recipient before enabling notifications.');save(settingsPath,s);json({ok:true});return true;
  }
  if(route==='/api/admin/submissions'&&req.method==='PATCH'){
   const b=await body(req),list=records(),item=list.find(i=>i.id===b.id);if(!item)throw error('Submission not found.',404);
   if(b.status!==undefined){if(!leadStatuses.includes(b.status)||(item.type==='career'&&b.status==='Client gained'))throw error('Invalid status.');item.status=b.status;}
   if(b.notes!==undefined){if(typeof b.notes!=='string'||b.notes.length>4000)throw error('Keep notes under 4,000 characters.');item.notes=b.notes;}
   if(b.followUpAt!==undefined){if(b.followUpAt&&(!/^\d{4}-\d{2}-\d{2}T/.test(b.followUpAt)||!Number.isFinite(Date.parse(b.followUpAt))))throw error('Choose a valid follow-up date.');item.followUpAt=b.followUpAt?new Date(b.followUpAt).toISOString():'';}
   item.updatedAt=new Date().toISOString();save(recordsPath,list);json({ok:true});return true;
  }
  return false;
 }
 const timer=setInterval(()=>processQueue().catch(()=>{}),30000);timer.unref();
 return {handle,prepare,processQueue,close:()=>clearInterval(timer)};
}
