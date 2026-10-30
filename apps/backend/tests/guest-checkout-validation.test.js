import test from 'node:test';import assert from 'node:assert/strict';
import {createCheckoutService,CheckoutError} from '../lib/guest-checkout.js';
test('rejects address parser metacharacters and malformed checkout data before accessing DB',async()=>{
 const db={$transaction(){throw Error('unexpected DB call')}};
 const svc=createCheckoutService({db,otpPepper:'a'.repeat(32),rateLimitSecret:'b'.repeat(32),sendOtp:async()=>{}});
 for(const email of ['one@example.test, two@example.test','name(comment)@example.test','a..b@example.test','a@-example.test','a@example.test\nBcc: x@example.test']){
  await assert.rejects(()=>svc.createDraft({name:'Test',email,whatsapp:'+6281234567890',ip:'192.0.2.1'}),e=>e instanceof CheckoutError&&e.status===400);
 }
 await assert.rejects(()=>svc.verifyOtp({draftId:'00000000-0000-4000-8000-000000000001',capability:'A'.repeat(43),code:123456,ip:'192.0.2.1'}),e=>e instanceof CheckoutError&&e.status===400);
});
