import test from 'node:test';import assert from 'node:assert/strict';
import {post,options} from '../lib/checkout-runtime.js';
test('checkout endpoints fail closed on origin and configuration',async()=>{
 const previous=process.env.ALLOWED_WEB_ORIGINS;process.env.ALLOWED_WEB_ORIGINS='https://store.example.test';
 try {
  let r=await post(new Request('https://api.example.test/api/checkout/draft',{method:'POST',headers:{origin:'https://evil.example.test','content-type':'application/json'},body:'{}'}),'draft');assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
  r=options(new Request('https://api.example.test/api/checkout/draft',{method:'OPTIONS',headers:{origin:'https://store.example.test','access-control-request-method':'POST','access-control-request-headers':'content-type'}}));assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),'https://store.example.test');
  r=await post(new Request('https://api.example.test/api/checkout/draft',{method:'POST',headers:{origin:'https://store.example.test','content-type':'text/plain'},body:'{}'}),'draft');assert.equal(r.status,415);
 }finally{if(previous===undefined)delete process.env.ALLOWED_WEB_ORIGINS;else process.env.ALLOWED_WEB_ORIGINS=previous}
});
