import pg from 'pg';
import assert from 'node:assert/strict';
// Only use an explicitly designated disposable test database.
const url=process.env.TEST_DATABASE_URL;
if(!url){console.error('Set TEST_DATABASE_URL to a disposable migrated database.');process.exit(1)}
const c=new pg.Client({connectionString:url});let begun=false;
async function expectRejected(query,params=[]){
 await c.query('SAVEPOINT expected_failure');let failed=false;
 try {await c.query(query,params)} catch {failed=true;await c.query('ROLLBACK TO SAVEPOINT expected_failure')}
 await c.query('RELEASE SAVEPOINT expected_failure');assert.equal(failed,true,'constraint did not reject invalid row');
}
try {
 await c.connect();await c.query('BEGIN');begun=true;
 await expectRejected("INSERT INTO users(email) VALUES ('Not-Normalized@EXAMPLE.test')");
 const user=(await c.query("INSERT INTO users(email) VALUES ('test@example.test') RETURNING id")).rows[0].id;
 await expectRejected("INSERT INTO users(email) VALUES ('test@example.test')");
 await expectRejected("INSERT INTO books(slug,title,author,price_minor,currency) VALUES ('invalid-book','Test','Test',-1,'IDR')");
 const book=(await c.query("INSERT INTO books(slug,title,author,price_minor,currency) VALUES ('test-book','Test','Test',1,'IDR') RETURNING id")).rows[0].id;
 await expectRejected("INSERT INTO orders(user_id,status,total_minor,currency) VALUES ($1,'unverified',1,'IDR')",[user]);
 await expectRejected("INSERT INTO book_assets(book_id,kind,object_key,page_number) VALUES ($1,'page','unused',NULL)",[book]);
 await expectRejected("INSERT INTO entitlements(user_id,book_id,status) VALUES ($1,$2,'revoked')",[user,book]);
 await c.query('ROLLBACK');begun=false;console.log('Schema constraints and rollback: PASS');
}catch {console.error('Schema verification failed; use an isolated test database.');process.exitCode=1}
finally{if(begun)await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{})}
