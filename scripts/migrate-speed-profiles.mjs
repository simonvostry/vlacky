import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.SPEED_PROFILE_MIGRATION_URL || process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Configure SPEED_PROFILE_MIGRATION_URL or TURSO_DATABASE_URL.');
const client = createClient({ url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN });
try {
  await client.batch([readFileSync(new URL('./speed-profile-migration.sql', import.meta.url), 'utf8')], 'write');
  console.log('Current speed profile table ready. Existing collection data unchanged.');
} finally { client.close(); }
