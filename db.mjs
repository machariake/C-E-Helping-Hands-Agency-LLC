import fs from 'node:fs';
import path from 'node:path';

let sqlClient = null;
let blobModule = null;

export async function initStorage() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      sqlClient = neon(dbUrl);
      // Ensure tables exist
      await sqlClient`
        CREATE TABLE IF NOT EXISTS ce_content (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      await sqlClient`
        CREATE TABLE IF NOT EXISTS ce_submissions (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      await sqlClient`
        CREATE TABLE IF NOT EXISTS ce_settings (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      console.log('[Storage] Connected to Neon PostgreSQL.');
    } catch (err) {
      console.error('[Storage] Failed to initialize Neon PostgreSQL:', err.message);
      sqlClient = null;
    }
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      blobModule = await import('@vercel/blob');
      console.log('[Storage] Vercel Blob storage initialized.');
    } catch (err) {
      console.error('[Storage] Failed to initialize Vercel Blob:', err.message);
      blobModule = null;
    }
  }
}

// In-memory content cache for ultra-fast page renders
let cachedContent = null;
let lastContentFetch = 0;

export async function readContent(fallbackPath, seedPath) {
  if (sqlClient) {
    try {
      // Use short 5-second cache to avoid hammering Neon on consecutive page assets, but stay fresh
      const now = Date.now();
      if (cachedContent && (now - lastContentFetch < 5000)) {
        return cachedContent;
      }
      const rows = await sqlClient`SELECT data FROM ce_content WHERE key = 'main'`;
      if (rows.length > 0 && rows[0].data) {
        cachedContent = rows[0].data;
        lastContentFetch = now;
        return cachedContent;
      }
      // If empty in DB, seed from seed.json or fallbackPath
      let initial = null;
      if (fs.existsSync(fallbackPath)) {
        initial = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      } else if (seedPath && fs.existsSync(seedPath)) {
        initial = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      }
      if (initial) {
        await sqlClient`INSERT INTO ce_content (key, data) VALUES ('main', ${JSON.stringify(initial)}::jsonb)`;
        cachedContent = initial;
        lastContentFetch = now;
        return cachedContent;
      }
    } catch (err) {
      console.error('[Storage] Error reading content from Neon:', err.message);
    }
  }

  // Disk fallback
  if (fs.existsSync(fallbackPath)) {
    return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
  }
  if (seedPath && fs.existsSync(seedPath)) {
    return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  }
  return {};
}

export async function saveContent(content, fallbackPath) {
  cachedContent = content;
  lastContentFetch = Date.now();

  if (sqlClient) {
    try {
      await sqlClient`
        INSERT INTO ce_content (key, data, updated_at)
        VALUES ('main', ${JSON.stringify(content)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
    } catch (err) {
      console.error('[Storage] Error saving content to Neon:', err.message);
    }
  }

  // Also save to disk if path provided
  if (fallbackPath) {
    try {
      fs.writeFileSync(fallbackPath + '.tmp', JSON.stringify(content, null, 2));
      fs.renameSync(fallbackPath + '.tmp', fallbackPath);
    } catch (err) {
      // Ephemeral disk or permission error on serverless can be ignored if DB succeeded
      if (!sqlClient) throw err;
    }
  }
}

export async function readSubmissions(fallbackPath) {
  if (sqlClient) {
    try {
      const rows = await sqlClient`SELECT data FROM ce_submissions ORDER BY created_at DESC`;
      return rows.map(r => r.data);
    } catch (err) {
      console.error('[Storage] Error reading submissions from Neon:', err.message);
    }
  }
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    try { return JSON.parse(fs.readFileSync(fallbackPath, 'utf8')); } catch { return []; }
  }
  return [];
}

export async function addSubmission(item, fallbackPath) {
  if (sqlClient) {
    try {
      await sqlClient`
        INSERT INTO ce_submissions (id, data, created_at)
        VALUES (${item.id}, ${JSON.stringify(item)}::jsonb, ${item.created || new Date().toISOString()})
      `;
    } catch (err) {
      console.error('[Storage] Error adding submission to Neon:', err.message);
    }
  }
  if (fallbackPath) {
    try {
      const list = fs.existsSync(fallbackPath) ? JSON.parse(fs.readFileSync(fallbackPath, 'utf8')) : [];
      list.unshift(item);
      fs.writeFileSync(fallbackPath + '.tmp', JSON.stringify(list, null, 2));
      fs.renameSync(fallbackPath + '.tmp', fallbackPath);
    } catch (err) {
      if (!sqlClient) throw err;
    }
  }
}

export async function updateSubmission(id, patchFnOrObj, fallbackPath) {
  let list = [];
  if (sqlClient) {
    try {
      const rows = await sqlClient`SELECT data FROM ce_submissions WHERE id = ${id}`;
      if (rows.length > 0) {
        let item = rows[0].data;
        if (typeof patchFnOrObj === 'function') {
          patchFnOrObj(item);
        } else {
          Object.assign(item, patchFnOrObj);
        }
        await sqlClient`
          UPDATE ce_submissions
          SET data = ${JSON.stringify(item)}::jsonb
          WHERE id = ${id}
        `;
      }
    } catch (err) {
      console.error('[Storage] Error updating submission in Neon:', err.message);
    }
  }

  if (fallbackPath && fs.existsSync(fallbackPath)) {
    try {
      list = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      const item = list.find(i => i.id === id);
      if (item) {
        if (typeof patchFnOrObj === 'function') {
          patchFnOrObj(item);
        } else {
          Object.assign(item, patchFnOrObj);
        }
        fs.writeFileSync(fallbackPath + '.tmp', JSON.stringify(list, null, 2));
        fs.renameSync(fallbackPath + '.tmp', fallbackPath);
      }
    } catch (err) {
      if (!sqlClient) throw err;
    }
  }
}

export async function readSettings(fallbackPath) {
  if (sqlClient) {
    try {
      const rows = await sqlClient`SELECT data FROM ce_settings WHERE key = 'notifications'`;
      if (rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    } catch (err) {
      console.error('[Storage] Error reading settings from Neon:', err.message);
    }
  }
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    try { return JSON.parse(fs.readFileSync(fallbackPath, 'utf8')); } catch {}
  }
  return { enabled: false, acknowledge: false, from: '', to: '', apiKey: '' };
}

export async function saveSettings(settings, fallbackPath) {
  if (sqlClient) {
    try {
      await sqlClient`
        INSERT INTO ce_settings (key, data, updated_at)
        VALUES ('notifications', ${JSON.stringify(settings)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
    } catch (err) {
      console.error('[Storage] Error saving settings to Neon:', err.message);
    }
  }
  if (fallbackPath) {
    try {
      fs.writeFileSync(fallbackPath + '.tmp', JSON.stringify(settings, null, 2));
      fs.renameSync(fallbackPath + '.tmp', fallbackPath);
    } catch (err) {
      if (!sqlClient) throw err;
    }
  }
}

export async function uploadMedia(filename, buffer, contentType) {
  if (blobModule && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await blobModule.put(filename, buffer, {
        access: 'public',
        contentType
      });
      return blob.url;
    } catch (err) {
      console.error('[Storage] Vercel Blob upload failed:', err.message);
    }
  }
  return null;
}
