import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const enabled = process.env.DISPOSABLE_TEST_DATABASE === '1' && Boolean(process.env.TEST_DATABASE_URL);
test('guest checkout schema constraints on an isolated migrated PostgreSQL database', {skip: !enabled}, async () => {
  // This test writes only inside a rolled-back transaction. Nevertheless, use
  // only a dedicated disposable database, NEVER an owner or production DB.
  const db = new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  await db.connect();
  const fail = async (sql, values = []) => {
    await db.query('SAVEPOINT rejected');
    let rejected = false;
    try { await db.query(sql, values); }
    catch (e) { if (!e.code || !String(e.code).startsWith('23')) throw e; rejected = true; }
    finally { await db.query('ROLLBACK TO SAVEPOINT rejected'); }
    assert.equal(rejected, true, 'Expected database constraint violation');
  };
  try {
    await db.query('BEGIN');
    const user = (await db.query("INSERT INTO users(email) VALUES('legacy-schema@example.test') RETURNING id")).rows[0].id;
    const legacy = (await db.query("INSERT INTO orders(user_id,total_minor,currency) VALUES($1,0,'IDR') RETURNING id",[user])).rows[0].id;
    assert.ok(legacy);
    const draft = (await db.query("INSERT INTO checkout_drafts(capability_hash,customer_name,customer_email,customer_whatsapp,expires_at) VALUES(decode(repeat('01',32),'hex'),'Sample','guest-schema@example.test','+628123456789',now()+interval '1 hour') RETURNING id")).rows[0].id;
    await fail("INSERT INTO orders(checkout_id,merchant_order_id,customer_name,customer_email,customer_whatsapp,total_minor,currency) VALUES($1,'guest-unverified','Sample','guest-schema@example.test','+628123456789',0,'IDR')",[draft]);
    const guest = (await db.query("INSERT INTO orders(checkout_id,merchant_order_id,customer_name,customer_email,customer_whatsapp,customer_email_verified_at,total_minor,currency) VALUES($1,'guest-verified','Sample','guest-schema@example.test','+628123456789',now(),0,'IDR') RETURNING id",[draft])).rows[0].id;
    await fail("INSERT INTO checkout_email_otps(checkout_id,otp_mac,attempts,expires_at) VALUES($1,decode(repeat('02',32),'hex'),6,now()+interval '10 minutes')",[draft]);
    await fail("INSERT INTO checkout_email_otps(checkout_id,otp_mac,expires_at) VALUES($1,decode(repeat('02',32),'hex'),now()+interval '11 minutes')",[draft]);
    await db.query("INSERT INTO checkout_email_otps(checkout_id,otp_mac,expires_at) VALUES($1,decode(repeat('02',32),'hex'),now()+interval '9 minutes')",[draft]);
    const book = (await db.query("INSERT INTO books(slug,title,author,price_minor,currency) VALUES('schema-sample','Schema sample','Author',0,'IDR') RETURNING id")).rows[0].id;
    const item = (await db.query('INSERT INTO order_items(order_id,book_id,unit_price_minor) VALUES($1,$2,0) RETURNING id',[guest,book])).rows[0].id;
    await fail("INSERT INTO download_tokens(order_item_id,token_hash,expires_at) VALUES($1,decode(repeat('03',32),'hex'),now()+interval '31 days')",[item]);
    await db.query("INSERT INTO download_tokens(order_item_id,token_hash,expires_at) VALUES($1,decode(repeat('03',32),'hex'),now()+interval '30 days')",[item]);
    await db.query("INSERT INTO payment_events(order_id,event_fingerprint,provider_status,status_code,amount_minor,currency) VALUES($1,decode(repeat('04',32),'hex'),'settlement','200',0,'IDR')",[guest]);
    await fail("INSERT INTO payment_events(order_id,event_fingerprint,provider_status,status_code,amount_minor,currency) VALUES($1,decode(repeat('04',32),'hex'),'settlement','200',0,'IDR')",[guest]);
  } finally { await db.query('ROLLBACK').catch(()=>{}); await db.end(); }
});
