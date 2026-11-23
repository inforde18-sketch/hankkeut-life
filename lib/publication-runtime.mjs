export function canonicalPath(path) {
  try { path = decodeURIComponent(path); } catch { return null; }
  if (/[%\\\x00]/.test(path) || path.split('/').some(p => p === '.' || p === '..')) return null;
  path = path.replace(/\/+/g, '/');
  if (path.endsWith('/index.html')) path = path.slice(0, -10);
  if (path === '/index.html') return '/';
  if (/^\/(?:sns|topics\/[^/]+|articles\/[^/]+)$/.test(path)) path += '/';
  return path;
}

export const liveArticles = (meta, now) => meta.articles.filter(p => p.at <= now);

export function publicationStatus(meta, now) {
  const live = liveArticles(meta, now).sort((a, b) => b.at - a.at);
  const pending = meta.articles.filter(p => p.at > now).sort((a, b) => a.at - b.at);
  return {mode: 'prebuilt-server-clock', timeZone: 'Asia/Seoul', publicationTimeKst: meta.clock,
    checkedAt: new Date(now).toISOString(), builtAt: meta.builtAt, publicArticleCount: live.length,
    latest: live[0] ? {slug: live[0].slug, date: live[0].date, visibleAt: new Date(live[0].at).toISOString()} : null,
    nextRelease: pending[0] ? {date: pending[0].date, visibleAt: new Date(pending[0].at).toISOString()} : null,
    preparedThrough: meta.preparedThrough, paidApiCalls: 0};
}

export function clockResponse(body, type, status = 200, head = false) {
  return new Response(head ? null : body, {status, headers: {
    'Content-Type': type, 'Cache-Control': 'no-store, max-age=0',
    'X-Hankkeut-Publication': 'server-clock', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }});
}

export async function servePublication(context, meta, pages, now = Date.now()) {
  const url = new URL(context.request.url), path = canonicalPath(url.pathname);
  if (path === '/api/publication-status') {
    if (!['GET', 'HEAD'].includes(context.request.method)) return new Response(null, {status: 405, headers: {Allow: 'GET, HEAD'}});
    return clockResponse(JSON.stringify(publicationStatus(meta, now)), 'application/json; charset=utf-8', 200, context.request.method === 'HEAD');
  }
  const versions = path && pages.routes[path];
  if (!versions) return context.next();
  if (!['GET', 'HEAD'].includes(context.request.method)) return new Response(null, {status: 405, headers: {Allow: 'GET, HEAD'}});
  let selected;
  for (const version of versions) if (version.at <= now) selected = version; else break;
  const type = path.endsWith('.xml') ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8';
  return clockResponse(selected ? selected.body : pages.notFound, type, selected ? 200 : 404, context.request.method === 'HEAD');
}
