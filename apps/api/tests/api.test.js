import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../src/app.js';
import {createPrivateObjectKey, getPrivateObject} from '../src/storage.js';
import {requireVerifiedSession} from '../src/auth.js';

const token='x'.repeat(40);
const env={ALLOWED_ORIGINS:'https://web.example.test',DB_HEALTH_TOKEN:token,DATABASE_URL:'not-a-real-url'};
const request=(path,init={})=>new Request(`http://local.test${path}`,init);

test('health, method validation, not-found and strict CORS',async()=>{
 const h=createHandler();
 let r=await h(request('/api/health'),env);assert.equal(r.status,200);assert.deepEqual(await r.json(),{status:'ok',service:'api'});assert.equal(r.headers.get('cache-control'),'no-store');
 r=await h(request('/api/health',{headers:{Origin:'https://evil.test'}}),env);assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
 r=await h(request('/api/health',{headers:{Origin:'https://web.example.test'}}),env);assert.equal(r.headers.get('access-control-allow-origin'),'https://web.example.test');
 r=await h(request('/api/health',{method:'POST'}),env);assert.equal(r.status,405);
 r=await h(request('/api/books/original'),env);assert.equal(r.status,404);
 r=await h(request('/api/health/db',{method:'OPTIONS',headers:{Origin:'https://web.example.test','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}}),env);assert.equal(r.status,204);
 r=await h(request('/api/health/db',{method:'OPTIONS',headers:{Origin:'https://web.example.test','Access-Control-Request-Method':'POST'}}),env);assert.equal(r.status,403);
});

test('database health fails closed, only checks after auth, sanitizes errors',async()=>{
 let calls=0;const h=createHandler({testConnection:async()=>{calls++;throw Error('sensitive example detail')}});
 let r=await h(request('/api/health/db'),env);assert.equal(r.status,401);assert.equal(calls,0);
 r=await h(request('/api/health/db',{headers:{Authorization:'Bearer wrong'}}),env);assert.equal(r.status,401);assert.equal(calls,0);
 r=await h(request('/api/health/db',{headers:{Authorization:`Bearer ${token}`}}),env);assert.equal(r.status,503);assert.deepEqual(await r.json(),{status:'unavailable'});assert.equal(calls,1);
 r=await h(request('/api/health/db',{headers:{Authorization:'Bearer short'}}),{...env,DB_HEALTH_TOKEN:'short'});assert.equal(r.status,401);assert.equal(calls,1);
 const ok=createHandler({testConnection:async url=>assert.equal(url,env.DATABASE_URL)});
 r=await ok(request('/api/health/db',{headers:{Authorization:`Bearer ${token}`}}),env);assert.equal(r.status,200);assert.deepEqual(await r.json(),{status:'ok'});
});

test('private object keys and disabled auth adapter',async()=>{
 const key=createPrivateObjectKey('original');assert.match(key,/^original\/[a-f0-9-]{36}$/);assert.throws(()=>createPrivateObjectKey('public'));
 let called=false;const bucket={get:async k=>{called=true;return k}};assert.equal(await getPrivateObject(bucket,key),key);assert.equal(called,true);
 await assert.rejects(()=>getPrivateObject(bucket,'../../secret'));await assert.rejects(()=>requireVerifiedSession(),/not configured/);
});
