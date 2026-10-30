import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../src/routing/routes.js';
test('route foundation matches home, placeholders and unknown paths', () => {
  for(const [path,name] of [['/','home'],['/login','login'],['/checkout','checkout'],['/my-library','library'],['/admin','admin'],['/book/natural-world','book'],['/reader/123','reader'],['/not-a-page','not-found'],['/book','not-found'],['/book/a/b','not-found']]) assert.equal(resolveRoute(path).name,name,path);
  assert.equal(resolveRoute('/book/natural-world').parameter,'natural-world');
  assert.equal(resolveRoute('/reader/123').parameter,'123');
  assert.equal(resolveRoute('/login/').name,'login');
});
