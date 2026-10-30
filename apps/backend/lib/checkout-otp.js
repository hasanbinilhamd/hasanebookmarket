import {createHmac, randomInt, timingSafeEqual} from 'node:crypto';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digits = /^\d{6}$/;

// These primitives are not a checkout endpoint. Database locking, expiry,
// attempt limits, resend limits, delivery and authorization remain required.
export function generateCheckoutOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}
export function checkoutOtpMac({checkoutId, code, pepper}) {
  if (!uuid.test(checkoutId || '') || !digits.test(code || '')) throw new TypeError('Invalid OTP input');
  if (typeof pepper !== 'string' || Buffer.byteLength(pepper, 'utf8') < 32) throw new Error('OTP pepper not configured');
  return createHmac('sha256', pepper).update('hasan-checkout-otp-v1\0').update(checkoutId.toLowerCase()).update('\0').update(code).digest();
}
export function matchesCheckoutOtp({checkoutId, code, pepper, storedMac}) {
  if (!Buffer.isBuffer(storedMac) || storedMac.length !== 32) return false;
  try { return timingSafeEqual(checkoutOtpMac({checkoutId, code, pepper}), storedMac); }
  catch { return false; }
}
