import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const readJson = async url => JSON.parse(await readFile(url,'utf8'));

test('Vercel builds only the web workspace and publishes the correct root output', async () => {
  const root=await readJson(new URL('../../../vercel.json', import.meta.url));
  assert.equal(root.framework,'vite');
  assert.equal(root.buildCommand,'npm run build --workspace @hasan/web');
  assert.equal(root.outputDirectory,'apps/web/dist');
  assert.ok(root.rewrites.some(rule=>rule.source==='/(.*)' && rule.destination==='/index.html'));
  const web=await readJson(new URL('../vercel.json', import.meta.url));
  assert.ok(web.rewrites.some(rule=>rule.source==='/(.*)' && rule.destination==='/index.html'));
  const pkg=await readJson(new URL('../../../package.json',import.meta.url));
  assert.equal(pkg.engines.node,'22.x');
});
