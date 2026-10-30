import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import pg from 'pg';

// Direct connection is required: session advisory locks are not safe through
// transaction-pooling proxies. Review target and back up before running.
const url=process.env.DATABASE_URL;
if(!url){console.error('DATABASE_URL must be set in the server environment.');process.exit(1)}
try {const host=new URL(url).hostname.toLowerCase();if(host.endsWith('.neon.tech') && host.includes('-pooler.')){console.error('Migrations require a direct, non-pooler Neon connection.');process.exit(1)}} catch {console.error('DATABASE_URL is invalid.');process.exit(1)}
const dir=fileURLToPath(new URL('../../../infrastructure/database/migrations/',import.meta.url));
const files=(await readdir(dir)).filter(f=>/^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
if(!files.length){console.error('No versioned migrations found.');process.exit(1)}
const client=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});
let locked=false;
try {
 await client.connect();
 await client.query('SELECT pg_advisory_lock($1)',[781349027]); locked=true;
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
 const previous=await client.query('SELECT version, checksum FROM schema_migrations');
 const applied=new Map(previous.rows.map(x=>[x.version,x.checksum]));
 for(const version of applied.keys()) if(!files.includes(version)) throw new Error('Applied migration file is missing.');
 const lastApplied=[...applied.keys()].sort().at(-1);
 if(lastApplied && files.some(file=>file<lastApplied && !applied.has(file))) throw new Error('Out-of-order migration.');
 for(const file of files){
   const sql=await readFile(path.join(dir,file),'utf8'); const checksum=createHash('sha256').update(sql).digest('hex');
   if(applied.has(file)){if(applied.get(file)!==checksum) throw new Error('Applied migration checksum mismatch.');console.log(`Already applied: ${file}`);continue}
   await client.query('BEGIN');
   try {await client.query(sql);await client.query('INSERT INTO schema_migrations (version,checksum) VALUES ($1,$2)',[file,checksum]);await client.query('COMMIT');console.log(`Applied: ${file}`)}
   catch(error){await client.query('ROLLBACK');throw error}
 }
} catch(error) {
 // Database exceptions can include URL, credentials, SQL or data. Never log them.
 console.error('Migration failed; check target, permissions, version/checksum history and database logs.');process.exitCode=1;
} finally {
 if(locked) try {await client.query('SELECT pg_advisory_unlock($1)',[781349027])} catch {}
 await client.end().catch(()=>{});
}
