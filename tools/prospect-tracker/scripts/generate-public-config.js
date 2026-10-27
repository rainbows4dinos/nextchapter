import { writeFile } from 'node:fs/promises';
import { readPublicConfig } from '../config.js';

// Explicit public allowlist; never copy environment credentials wholesale.
const config = readPublicConfig(process.env);
const brandfetchId = process.env.BRANDFETCH_CLIENT_ID?.trim();
if (brandfetchId && !/^[A-Za-z0-9_-]{1,128}$/.test(brandfetchId)) throw new Error('Invalid public Brandfetch client ID');
await writeFile(new URL('../public-env.js', import.meta.url),
  `// Generated from public environment settings. Do not edit.\nexport default ${JSON.stringify({
    SUPABASE_URL: config.supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
    ...(brandfetchId ? { BRANDFETCH_CLIENT_ID: brandfetchId } : {})
  }, null, 2)};\n`);
console.log('Generated tools/prospect-tracker/public-env.js (public credentials only).');
