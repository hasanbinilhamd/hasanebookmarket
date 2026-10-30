import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCheckoutOtp, checkoutOtpMac, matchesCheckoutOtp} from '../lib/checkout-otp.js';

const fixture = {checkoutId:'d8bba098-83af-442d-84b2-a1601314970e', code:'000017', pepper:'test-only-pepper-not-for-production-0000'};
test('checkout OTP is six digits and MAC binds checkout and secret', () => {
  for (let i=0; i<50; i++) assert.match(generateCheckoutOtp(), /^\d{6}$/);
  const storedMac = checkoutOtpMac(fixture);
  assert.equal(storedMac.length, 32);
  assert.equal(matchesCheckoutOtp({...fixture, storedMac}), true);
  assert.equal(matchesCheckoutOtp({...fixture, code:'000018', storedMac}), false);
  assert.equal(matchesCheckoutOtp({...fixture, checkoutId:'b87284ce-8ab6-4c02-a3f5-01df21e3f247', storedMac}), false);
  assert.equal(matchesCheckoutOtp({...fixture, pepper:'other-test-pepper-that-is-long-enough-000', storedMac}), false);
  assert.equal(matchesCheckoutOtp({...fixture, storedMac:Buffer.alloc(4)}), false);
  assert.throws(()=>checkoutOtpMac({...fixture, pepper:'short'}));
  assert.throws(()=>checkoutOtpMac({...fixture, code:'17'}));
});
