// Pure route resolution; parameters are never used as HTML or trusted data.
export function resolveRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return {name:'home'};
  const detail = path.match(/^\/book\/([^/]+)$/);
  if (detail) return {name:'book', parameter:detail[1]};
  const reader = path.match(/^\/reader\/([^/]+)$/);
  if (reader) return {name:'reader', parameter:reader[1]};
  const known = {'/login':'login','/checkout':'checkout','/my-library':'library','/admin':'admin'};
  return {name:known[path] || 'not-found'};
}
