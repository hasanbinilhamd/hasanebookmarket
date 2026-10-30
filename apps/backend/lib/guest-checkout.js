import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {checkoutOtpMac,generateCheckoutOtp,matchesCheckoutOtp} from './checkout-otp.js';

export class CheckoutError extends Error {
  constructor(status, code){super(code);this.status=status;this.code=code;}
}
const fail = (status, code) => { throw new CheckoutError(status,code); };
const secret = (x) => typeof x==='string' && Buffer.byteLength(x,'utf8')>=32;
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const codePattern=/^\d{6}$/;
// Deliberately conservative single-address syntax: reject display names,
// comments, address lists and controls before passing input to the mailer.
function validEmail(email) {
  if(typeof email!=='string'||email.length>254) return false;
  const pieces=email.split('@');if(pieces.length!==2||pieces[0].length>64||pieces[0].startsWith('.')||pieces[0].endsWith('.')||pieces[0].includes('..'))return false;
  return /^[a-z0-9!#$%&'*+\/=?^_`{|}~.-]+$/i.test(pieces[0]) && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(pieces[1]);
}
const hashToken = token=>createHash('sha256').update(token).digest();

export function createCheckoutService({db,otpPepper,rateLimitSecret,sendOtp}) {
  if(!db || !secret(otpPepper) || !secret(rateLimitSecret) || typeof sendOtp!=='function') throw new Error('Checkout service not configured');
  const hashSubject=(type,value)=>createHmac('sha256',rateLimitSecret).update(type+'\0'+value).digest();
  async function limit(action, subjects) {
    // This short transaction is deliberately independent: rejected OTP attempts
    // must not roll back the rate counter. Subjects are HMACed, not stored raw.
    const counts=await db.$transaction(async tx=>{
      const out=[];
      for(const [type,value,max] of subjects) {
        const h=hashSubject(type,value);
        const rows=await tx.$queryRaw`INSERT INTO checkout_rate_limits(subject_hash,action,window_started_at,count)
          VALUES(${h},${action},date_trunc('minute',now()),1)
          ON CONFLICT(subject_hash,action,window_started_at) DO UPDATE SET count=checkout_rate_limits.count+1
          RETURNING count`;
        out.push([Number(rows[0].count),max]);
      }
      return out;
    });
    if(counts.some(([n,max])=>n>max)) fail(429,'rate_limited');
  }
  async function lockDraft(tx,draftId,token) {
    if(!idPattern.test(draftId||'') || !tokenPattern.test(token||'')) fail(401,'invalid_checkout');
    const digest=hashToken(token);
    const rows=await tx.$queryRaw`SELECT id,customer_email,email_verified_at,expires_at,now() AS server_now
      FROM checkout_drafts WHERE id=${draftId}::uuid AND capability_hash=${digest} FOR UPDATE`;
    if(!rows.length || rows[0].expires_at<=rows[0].server_now) fail(401,'invalid_checkout');
    return rows[0];
  }
  function validIp(ip){if(typeof ip!=='string' || !ip || ip.length>64) fail(503,'unavailable');return ip;}
  return {
    async createDraft({name,email,whatsapp,ip}) {
      ip=validIp(ip); name=typeof name==='string'?name.trim():''; email=typeof email==='string'?email.trim().toLowerCase():'';
      whatsapp=typeof whatsapp==='string'?whatsapp.replace(/[\s()-]/g,''):'';
      if(name.length<1||name.length>160||!validEmail(email)||!/^\+?\d{7,20}$/.test(whatsapp)) fail(400,'invalid_input');
      await limit('draft_create',[['ip',ip,20],['email',email,5]]);
      const id=randomUUID(),capability=randomBytes(32).toString('base64url'),digest=hashToken(capability);
      await db.$executeRaw`INSERT INTO checkout_drafts(id,capability_hash,customer_name,customer_email,customer_whatsapp,expires_at)
        VALUES(${id}::uuid,${digest},${name},${email},${whatsapp},now()+interval '24 hours')`;
      return {id,capability};
    },
    async requestOtp({draftId,capability,ip}) {
      ip=validIp(ip);
      if(!idPattern.test(draftId||'')||!tokenPattern.test(capability||'')) fail(401,'invalid_checkout');
      await limit('otp_send',[['ip',ip,15],['draft',draftId,3]]);
      const code=generateCheckoutOtp();
      const email=await db.$transaction(async tx=>{
        const draft=await lockDraft(tx,draftId,capability);
        if(draft.email_verified_at) fail(409,'already_verified');
        const previous=await tx.$queryRaw`SELECT last_sent_at,now() AS server_now FROM checkout_email_otps WHERE checkout_id=${draftId}::uuid FOR UPDATE`;
        if(previous.length && previous[0].server_now-previous[0].last_sent_at<60_000) fail(429,'rate_limited');
        const mac=checkoutOtpMac({checkoutId:draftId,code,pepper:otpPepper});
        await tx.$executeRaw`INSERT INTO checkout_email_otps(checkout_id,otp_mac,attempts,expires_at,last_sent_at,consumed_at,created_at)
          VALUES(${draftId}::uuid,${mac},0,now()+interval '10 minutes',now(),NULL,now())
          ON CONFLICT(checkout_id) DO UPDATE SET otp_mac=EXCLUDED.otp_mac,attempts=0,expires_at=EXCLUDED.expires_at,last_sent_at=EXCLUDED.last_sent_at,consumed_at=NULL,created_at=EXCLUDED.created_at`;
        return draft.customer_email;
      });
      // Also throttle by recipient across distinct drafts/IPs to limit mail abuse.
      // This occurs after code issuance: a throttled delivery is not sent and
      // the draft observes the same cooldown as a failed SMTP delivery.
      await limit('otp_send_recipient',[['email',email,3]]);
      try { await sendOtp({email,code}); } catch { fail(503,'email_unavailable'); }
      return {sent:true};
    },
    async verifyOtp({draftId,capability,code,ip}) {
      ip=validIp(ip);
      if(!idPattern.test(draftId||'')||!tokenPattern.test(capability||'')||typeof code!=='string'||!codePattern.test(code)) fail(400,'invalid_input');
      await limit('otp_verify',[['ip',ip,30],['draft',draftId,10]]);
      const ok=await db.$transaction(async tx=>{
        const draft=await lockDraft(tx,draftId,capability);
        const rows=await tx.$queryRaw`SELECT otp_mac,attempts,expires_at,consumed_at,now() AS server_now FROM checkout_email_otps WHERE checkout_id=${draftId}::uuid FOR UPDATE`;
        if(draft.email_verified_at||!rows.length) return false;
        const o=rows[0];
        if(o.consumed_at || o.attempts>=5 || o.expires_at<=o.server_now) return false;
        const matches=matchesCheckoutOtp({checkoutId:draftId,code,pepper:otpPepper,storedMac:Buffer.from(o.otp_mac)});
        await tx.$executeRaw`UPDATE checkout_email_otps SET attempts=attempts+1,consumed_at=CASE WHEN ${matches} THEN now() ELSE consumed_at END WHERE checkout_id=${draftId}::uuid`;
        if(matches) await tx.$executeRaw`UPDATE checkout_drafts SET email_verified_at=now(),updated_at=now() WHERE id=${draftId}::uuid`;
        return matches;
      });
      if(!ok) fail(400,'invalid_or_expired_code');
      return {verified:true};
    }
  };
}
