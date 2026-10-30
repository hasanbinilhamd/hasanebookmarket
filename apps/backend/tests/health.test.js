import test from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../app/api/health/route.js';

test('Next backend exposes a no-store health response without secrets', async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {status:'ok',service:'backend'});
});
