import assert from 'node:assert/strict';
import {readFile, stat, mkdtemp, mkdir, cp, writeFile, rm} from 'node:fs/promises';
import {resolve, dirname, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';
import meta from '../runtime/publication-meta.generated.mjs';
import pages from '../runtime/publication-pages.generated.mjs';
import {servePublication, publicationStatus} from '../lib/publication-runtime.mjs';
import {publicationPlan} from './publication-plan.mjs';
import {releaseTime} from '../lib/publication-clock.mjs';
import {articleDigest} from './publication-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
// Pages bundles JSON imports; Node requires an import attribute for the same JSON.
// Adapt only the test loader, leaving the deployed handler's known Pages syntax intact.
let commentSource = await readFile('functions/api/comments.js', 'utf8');
commentSource = commentSource.replace("'../../runtime/publication-meta.generated.mjs'", JSON.stringify(pathToFileURL(resolve('runtime/publication-meta.generated.mjs')).href));
commentSource = commentSource.replace("'../../content/comment-moderation.json';", JSON.stringify(pathToFileURL(resolve('content/comment-moderation.json')).href) + " with {type:'json'};");
const {onRequest: comments} = await import('data:text/javascript;base64,' + Buffer.from(commentSource).toString('base64'));
const read = async name => JSON.parse(await readFile(name, 'utf8'));
const [config, posts, queue, reviews] = await Promise.all([
  'site.config.json', 'content/articles.json', 'content/queue.json', 'content/publication-reviews.json',
].map(read));
const plan = publicationPlan(config, posts, queue, reviews);
const request = (path, now, method = 'GET', headers = {}) => servePublication({
  request: new Request('https://hankkeut-life.pages.dev' + path, {method, headers}),
  next: async () => new Response('static passthrough'),
}, meta, pages, now);
let boundaries = 0, links = 0;
for (const [index, {post, at}] of plan.entries()) {
  const url = '/articles/' + post.slug + '/';
  assert.equal(new Date(at + 9 * 3600000).toISOString().slice(11, 16), '08:17');
  for (const alias of [url, url.slice(0, -1), url + 'index.html', url.replace(post.slug[0], '%' + post.slug.charCodeAt(0).toString(16))]) {
    assert.equal((await request(alias + '?now=2099-01-01&preview=1', at - 1, 'GET', {'x-now': '2099-01-01'})).status, 404);
    assert.equal((await request(alias, at)).status, 200);
  }
  const head = await request(url, at, 'HEAD');
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.match(head.headers.get('Cache-Control'), /no-store/);
  assert.equal((await request(url, at, 'POST')).status, 405);
  assert.equal(publicationStatus(meta, at - 1).publicArticleCount, posts.length + index);
  assert.equal(publicationStatus(meta, at).publicArticleCount, posts.length + index + 1);
  for (const path of ['/', '/index.html', '/sns/', '/contact/', '/sitemap.xml', '/feed.xml', '/topics/digital-cleanup/','/topics/account-security/','/topics/safe-internet/']) {
    const before = await (await request(path, at - 1)).text(), after = await (await request(path, at)).text();
    if (!path.startsWith('/topics/')) {const marker = path === '/contact/' ? post.slug : url; assert(!before.includes(marker), path + ' leaked future link'); assert(after.includes(marker), path + ' missed release');}
    for (const later of plan.slice(index + 1)) assert(!after.includes('/articles/' + later.post.slug + '/'), path + ' leaked later guide');
  }
  const html = await (await request(url, at)).text();
  assert(html.includes(post.title)); assert(html.includes('property="og:image"'));
  assert.equal((html.match(/<figure class=.guide-example.>/g) || []).length, 1);
  assert(!/googlesyndication|api\.openai\.com/.test(html));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(Date.parse(schema.datePublished), at);
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    const file = resolve('dist', '.' + m[1], m[1].endsWith('/') ? 'index.html' : '');
    try { await stat(file); } catch { assert.equal((await request(m[1], at)).status, 200, 'Missing link: ' + m[1]); }
    links++;
  }
  const savedNow = Date.now;
  let reads = 0;
  const env = {COMMENTS_DB: {prepare: () => {reads++; const stmt = {bind: () => stmt, run: async () => ({meta: {changes: 0}}), all: async () => ({results: []})}; return stmt;}}};
  try {
    Date.now = () => at - 1;
    assert.equal((await comments({request: new Request('https://hankkeut-life.pages.dev/api/comments?article=' + post.slug), env})).status, 404);
    assert.equal(reads, 0, 'Early comment request touched D1');
    Date.now = () => at;
    assert.equal((await comments({request: new Request('https://hankkeut-life.pages.dev/api/comments?article=' + post.slug), env})).status, 200);
  } finally {Date.now = savedNow;}
  boundaries++;
}
assert.equal(await (await request('/assets/style.css', Date.now())).text(), 'static passthrough');
const routes = await read('dist/_routes.json');
assert(!routes.include.includes('/*')); assert(routes.include.includes('/api/comments'));
assert(!routes.include.some(p => p.startsWith('/assets')));
if (plan.length) {
  const status = await (await request('/api/publication-status', plan[0].at - 1)).json();
  assert.equal(status.nextRelease.date, plan[0].post.date);
  assert(!JSON.stringify(status).includes(plan[0].post.slug), 'Status must not expose upcoming content');
}
assert.equal((await request('/api/publication-status', Date.now(), 'POST')).status, 405);
const guardPost = {...structuredClone(queue[0] || posts[0]), slug: 'review-guard-fixture', status: 'scheduled',
  date: '2099-01-01', publishAt: '2099-01-01T08:00:00+09:00', reviewed: true, sourcesChecked: true, rightsChecked: true};
const guardReview = {...Object.values(reviews)[0], digest: articleDigest(guardPost), sourceUrls: guardPost.sources.map(s => s.url)};
const guardReviews = {[guardPost.slug]: guardReview};
assert.equal(publicationPlan(config, [], [guardPost], guardReviews).length, 1);
assert.equal(new Date(releaseTime({...guardPost, publishAt: '2099-01-01T09:30:00+09:00'}, config)).toISOString(), '2099-01-01T00:30:00.000Z');
assert.throws(() => releaseTime({...guardPost, publishAt: '2099-01-02T08:00:00+09:00'}, config), /불일치/);
assert.throws(() => publicationPlan(config, [], [{...guardPost, summary: guardPost.summary + ' changed'}], guardReviews), /검토/);
assert.equal(publicationPlan(config, [], [{...guardPost, reviewed: false}], guardReviews).length, 0);
const second = {...guardPost, slug: 'second-guard-fixture'};
assert.throws(() => publicationPlan(config, [], [guardPost, second], {...guardReviews, [second.slug]: {...guardReview, digest: articleDigest(second)}}), /중복/);
assert.deepEqual(publicationPlan(config, posts, [], reviews), []);
for (const {post} of plan) await assert.rejects(stat(resolve('dist/articles', post.slug, 'index.html')), 'Future HTML must stay outside public assets');
assert(gzipSync(await readFile('runtime/publication-pages.generated.mjs')).length < 2 * 1024 * 1024);

// Exercise source reconciliation in an isolated fixture with a several-day GitHub delay.
await mkdir('work', {recursive: true});
const fixture = await mkdtemp(resolve('work', 'clock-reconcile-'));
try {
  await mkdir(resolve(fixture, 'content')); await mkdir(resolve(fixture, 'scripts')); await mkdir(resolve(fixture, 'lib'));
  for (const file of ['publish-due.mjs', 'publication-plan.mjs', 'publication-review.mjs', 'validate.mjs']) await cp('scripts/' + file, resolve(fixture, 'scripts', file));
  await cp('lib/publication-clock.mjs', resolve(fixture, 'lib/publication-clock.mjs'));
  await writeFile(resolve(fixture, 'site.config.json'), JSON.stringify(config));
  const sample = structuredClone(guardPost);
  const dates = ['2026-01-02', '2026-01-03'];
  const older = dates.map((date, i) => ({...sample, slug: 'delayed-' + i, date, publishAt: date + 'T08:00:00+09:00'}));
  const checked = Object.fromEntries(older.map(p => [p.slug, {...guardReview, digest: articleDigest(p)}]));
  const put = (name, value) => writeFile(resolve(fixture, 'content', name), JSON.stringify(value));
  const run = args => spawnSync(process.execPath, ['scripts/publish-due.mjs', ...args], {cwd: fixture, encoding: 'utf8'});
  await put('articles.json', []); await put('queue.json', older); await put('publication-reviews.json', checked);
  assert.equal(run(['--dry-run']).status, 0); assert.deepEqual(JSON.parse(await readFile(resolve(fixture, 'content/articles.json'))), []);
  const first = run([]); assert.equal(first.status, 0, first.stderr);
  const archived = JSON.parse(await readFile(resolve(fixture, 'content/articles.json')));
  assert.deepEqual(archived.map(p => p.date), dates);
  for (const p of archived) {assert(p.visibleAt.endsWith('23:17:00.000Z')); assert(p.archivedAt !== p.visibleAt);}
  assert.equal(run([]).status, 0); assert.equal(JSON.parse(await readFile(resolve(fixture, 'content/articles.json'))).length, 2);
  await put('articles.json', []); older[0].summary += ' unreviewed change'; await put('queue.json', older);
  assert.notEqual(run([]).status, 0); assert.deepEqual(JSON.parse(await readFile(resolve(fixture, 'content/articles.json'))), []);
} finally {
  if (dirname(fixture) !== resolve('work') || !fixture.startsWith(resolve('work', 'clock-reconcile-'))) throw Error('잘못된 시험 폴더');
  await rm(fixture, {recursive: true, force: true});
}
console.log(`Timed publication tests passed: ${boundaries} exact boundaries, ${links} article links/assets, aliases/query bypass, no stale caching, same-time lists/feed/sitemap/comments, review gates, delayed archive and idempotency.`);
