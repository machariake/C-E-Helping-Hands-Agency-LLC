import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),base='http://localhost:4173';
async function isRunning(){try{const r=await fetch(base+'/api/content',{signal:AbortSignal.timeout(1000)});return r.ok&&(await r.json()).business?.name;}catch{return false;}}
if(!await isRunning()){
 const log=fs.openSync(path.join(root,'server.log'),'a');
 const child=spawn(process.execPath,[path.join(root,'server.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log,log]});child.unref();fs.closeSync(log);
 for(let n=0;n<30;n++){if(await isRunning())break;await new Promise(resolve=>setTimeout(resolve,300));}
}
if(!await isRunning())throw Error('The website did not start. See server.log in your website folder.');
let url=base;
if(process.argv[2]==='admin'){url+='/admin';if(!fs.existsSync(path.join(root,'data','account.json')))url+='#key='+fs.readFileSync(path.join(root,'data','admin-key.txt'),'utf8').trim();}
spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,windowsHide:true,stdio:'ignore'}).unref();
