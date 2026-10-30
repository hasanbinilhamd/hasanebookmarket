import {neon} from '@neondatabase/serverless';

// HTTP is appropriate for a single health query. No driver or credentials
// are imported into the web workspace. The client is created per request.
export async function checkDatabase(databaseUrl) {
  if (!databaseUrl) throw new Error('unconfigured');
  const sql = neon(databaseUrl);
  const rows = await sql`SELECT 1 AS ok`;
  if (rows[0]?.ok !== 1) throw new Error('unavailable');
}
