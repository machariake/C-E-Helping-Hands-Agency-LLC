const fs = require('fs');
let src = fs.readFileSync('server.mjs', 'utf8');

// Fix 1: Add isVercel flag and use /tmp for data on Vercel
src = src.replace(
  "const root=path.dirname(fileURLToPath(import.meta.url)), data=path.join(root,'data'), pub=path.join(root,'public');",
  "const isVercel=!!process.env.VERCEL;\nconst root=path.dirname(fileURLToPath(import.meta.url)), data=isVercel?'/tmp/ce-data':path.join(root,'data'), pub=path.join(root,'public');"
);

// Fix 2: Safe uploads mkdir
src = src.replace(
  "fs.mkdirSync(path.join(pub,'uploads'),{recursive:true});",
  "try{fs.mkdirSync(path.join(pub,'uploads'),{recursive:true});}catch{}"
);

// Fix 3: Relax sameOrigin for Vercel
src = src.replace(
  "const sameOrigin=req=>!req.headers.origin||",
  "const sameOrigin=req=>isVercel||!req.headers.origin||"
);

// Fix 4: Relax host check for Vercel
src = src.replace(
  "if(![`localhost:",
  "if(!isVercel&&![`localhost:"
);

fs.writeFileSync('server.mjs', src);
console.log('Patched OK');
const patched = fs.readFileSync('server.mjs','utf8');
console.log('isVercel occurrences:', (patched.match(/isVercel/g)||[]).length);
