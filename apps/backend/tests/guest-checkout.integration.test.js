import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {createCheckoutService,CheckoutError} from '../lib/guest-checkout.js';

const enabled=process.env.DISPOSABLE_TEST_DATABASE==='1'&&Boolean(process.env.TEST_DATABASE_URL);
const pepper='only-test-otp-pepper-0000000000000000000',rateSecret='only-test-rate-secret-00000000000000000';
test('checkout email OTP transactions with a disposable database and mock mail', {skip:!enabled}, async()=>{
  // Explicitly supplied test DB only. Never point TEST_DATABASE_URL at real data.
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  const db=new PrismaClient(),sent=[];
  const svc=createCheckoutService({db,otpPepper:pepper,rateLimitSecret:rateSecret,sendOtp:async x=>sent.push(x)});
  const ip='192.0.2.123';let ids=[];
  const create=async n=>{const d=await svc.createDraft({name:'Test',email:`OTP-${n}@example.test`,whatsapp:'+62 812 3456 7890',ip});ids.push(d.id);return d};
  const send=async d=>{await svc.requestOtp({draftId:d.id,capability:d.capability,ip});return sent.at(-1).code};
  const reject=async(fn,status)=>assert.rejects(fn,e=>e instanceof CheckoutError&&e.status===status);
  try{
    const a=await create(1);assert.equal(a.capability.length,43);let rows=await db.$queryRaw`SELECT customer_email,customer_whatsapp FROM checkout_drafts WHERE id=${a.id}::uuid`;assert.equal(rows[0].customer_email,'otp-1@example.test');assert.equal(rows[0].customer_whatsapp,'+6281234567890');
    const code=await send(a);assert.match(code,/^\d{6}$/);
    const stored=await db.$queryRaw`SELECT otp_mac FROM checkout_email_otps WHERE checkout_id=${a.id}::uuid`;assert.notEqual(Buffer.from(stored[0].otp_mac).toString(),code);
    await reject(()=>svc.requestOtp({draftId:a.id,capability:a.capability,ip}),429);
    const result=await svc.verifyOtp({draftId:a.id,capability:a.capability,code,ip});assert.equal(result.verified,true);
    await reject(()=>svc.verifyOtp({draftId:a.id,capability:a.capability,code,ip}),400);
    const b=await create(2);const bcode=await send(b);const wrong=bcode==='999999'?'888888':'999999';
    for(let i=0;i<5;i++)await reject(()=>svc.verifyOtp({draftId:b.id,capability:b.capability,code:wrong,ip}),400);
    await reject(()=>svc.verifyOtp({draftId:b.id,capability:b.capability,code:bcode,ip}),400);
    const attempts=await db.$queryRaw`SELECT attempts FROM checkout_email_otps WHERE checkout_id=${b.id}::uuid`;assert.equal(attempts[0].attempts,5);
    const c=await create(3),ccode=await send(c);await db.$executeRaw`UPDATE checkout_email_otps SET created_at=now()-interval '2 minutes', expires_at=now()-interval '1 minute' WHERE checkout_id=${c.id}::uuid`;
    await reject(()=>svc.verifyOtp({draftId:c.id,capability:c.capability,code:ccode,ip}),400);
    const d=await create(4),dcode=await send(d);await reject(()=>svc.verifyOtp({draftId:d.id,capability:'A'.repeat(43),code:dcode,ip}),401);
    const outcomes=await Promise.allSettled([svc.verifyOtp({draftId:d.id,capability:d.capability,code:dcode,ip}),svc.verifyOtp({draftId:d.id,capability:d.capability,code:dcode,ip})]);
    assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
    const verified=await db.$queryRaw`SELECT email_verified_at FROM checkout_drafts WHERE id=${d.id}::uuid`;assert.ok(verified[0].email_verified_at);
    // Different drafts cannot bypass the shared per-recipient send limit.
    const minuteStart=await db.$queryRaw`SELECT date_trunc('minute',now()) AS minute`;
    const recipientOutcomes=[];
    for(let i=0;i<4;i++){
      const x=await create(5);
      recipientOutcomes.push(await send(x).then(()=>true,err=>{assert.ok(err instanceof CheckoutError&&err.status===429);return false}));
    }
    const minuteEnd=await db.$queryRaw`SELECT date_trunc('minute',now()) AS minute`;
    if(+minuteStart[0].minute===+minuteEnd[0].minute) assert.deepEqual(recipientOutcomes,[true,true,true,false]);
    const broken=createCheckoutService({db,otpPepper:pepper,rateLimitSecret:rateSecret,sendOtp:async()=>{throw Error('sensitive provider error')}});
    const e=await create(6);
    await assert.rejects(()=>broken.requestOtp({draftId:e.id,capability:e.capability,ip}),err=>err instanceof CheckoutError&&err.status===503&&err.message==='email_unavailable');
    await reject(()=>broken.requestOtp({draftId:e.id,capability:e.capability,ip}),429);
  }finally{
    for(const id of ids)await db.$executeRaw`DELETE FROM checkout_drafts WHERE id=${id}::uuid`;
    await db.$disconnect();
  }
});
