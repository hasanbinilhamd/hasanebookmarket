import {checkDatabase} from './db.js';

const paths = new Set(['/api/health', '/api/health/db']);
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
function json(body,status=200,extra={}) {return new Response(JSON.stringify(body),{status,headers:{...headers,...extra}})}
function isAllowed(origin, config) {
  if (!origin || origin === 'null') return false;
  return (config || '').split(',').map(x=>x.trim()).filter(Boolean).some(x=>x===origin);
}
async function validToken(auth, expected) {
  if (!expected || expected.length < 32 || expected.length > 256 || !auth?.startsWith('Bearer ') || auth.length > 263) return false;
  const encode = s=>new TextEncoder().encode(s);
  const [a,b] = await Promise.all([crypto.subtle.digest('SHA-256',encode(auth.slice(7))), crypto.subtle.digest('SHA-256',encode(expected))]);
  const aa=new Uint8Array(a), bb=new Uint8Array(b); let diff=0; for(let i=0;i<aa.length;i++) diff |= aa[i]^bb[i];
  return diff === 0;
}
export function createHandler({testConnection=checkDatabase}={}) {
  return async function handle(request,env={}) {
    const origin=request.headers.get('Origin');
    if (origin && !isAllowed(origin,env.ALLOWED_ORIGINS)) return json({error:'Forbidden'},403,{'vary':'Origin'});
    const cors=origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{};
    try {
      const path=new URL(request.url).pathname;
      if (!paths.has(path)) return json({error:'Not found'},404,cors);
      if (request.method==='OPTIONS') {
        if(!origin || request.headers.get('Access-Control-Request-Method')!=='GET') return json({error:'Forbidden'},403,cors);
        const requested=(request.headers.get('Access-Control-Request-Headers')||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
        if(requested.some(h=>!['authorization'].includes(h))) return json({error:'Forbidden'},403,cors);
        return new Response(null,{status:204,headers:{...cors,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Authorization','access-control-max-age':'600','cache-control':'no-store'}});
      }
      if(request.method!=='GET') return json({error:'Method not allowed'},405,{...cors,'allow':'GET, OPTIONS'});
      if(path==='/api/health') return json({status:'ok',service:'api'},200,cors);
      // No DB work occurs before a server-configured, high-entropy token is verified.
      if(!await validToken(request.headers.get('Authorization'),env.DB_HEALTH_TOKEN)) return json({error:'Unauthorized'},401,cors);
      try { await testConnection(env.DATABASE_URL); return json({status:'ok'},200,cors); }
      catch { return json({status:'unavailable'},503,cors); }
    } catch { return json({error:'Internal server error'},500,cors); }
  };
}
