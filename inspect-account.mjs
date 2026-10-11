import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq !== -1) {
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      process.env[trimmed.slice(0, eq).trim()] = val;
    }
  }
}

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT key, data, updated_at FROM ce_settings`;
console.log('ROWS IN CE_SETTINGS:', JSON.stringify(rows, null, 2));
