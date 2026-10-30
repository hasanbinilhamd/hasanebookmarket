// Server-only building blocks. No HTTP route exposes these helpers. A future
// caller MUST authenticate, authorize the specific object and enforce limits.
export function createPrivateObjectKey(kind) {
  if (!['original', 'page'].includes(kind)) throw new TypeError('Invalid asset kind');
  return `${kind}/${crypto.randomUUID()}`;
}
export async function getPrivateObject(bucket, key) {
  if (!bucket || !/^(original|page)\/[0-9a-f-]{36}$/i.test(key)) throw new TypeError('Invalid private object reference');
  return bucket.get(key);
}
