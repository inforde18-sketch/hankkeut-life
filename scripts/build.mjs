import {readFile, writeFile, mkdir, readdir, cp, rm} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {publicationPlan} from './publication-plan.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const read = async name => JSON.parse(await readFile(name, 'utf8'));
const [config, posts, queue, reviews] = await Promise.all([
  'site.config.json', 'content/articles.json', 'content/queue.json', 'content/publication-reviews.json',
].map(read));
const plan = publicationPlan(config, posts, queue, reviews);
const stage = resolve('.publication-stage');
if (dirname(stage) !== root) throw Error('잘못된 준비 폴더');
const render = (at, output) => execFileSync(process.execPath, ['scripts/render-site.mjs'], {
  cwd: root, env: {...process.env, HANKKEUT_RENDER_AT: at === null ? '' : new Date(at).toISOString(), HANKKEUT_RENDER_OUTPUT: output},
  encoding: 'utf8', maxBuffer: 1024 * 1024,
});
render(null, 'dist');
const core = ['index.html', 'sns/index.html', 'contact/index.html', 'topics/digital-cleanup/index.html',
  'topics/account-security/index.html', 'topics/safe-internet/index.html', 'sitemap.xml', 'feed.xml'];
const route = file => '/' + file.replace(/index\.html$/, '');
const routes = {};
for (const file of core) routes[route(file)] = [{at: 0, body: await readFile(resolve('dist', file), 'utf8')}];
try {
  for (const {post, at} of plan) {
    render(at, '.publication-stage');
    for (const file of core) {
      const body = await readFile(resolve(stage, file), 'utf8'), versions = routes[route(file)];
      if (body !== versions.at(-1).body) versions.push({at, body});
    }
    // Future HTML is bundled server-side only, never written into the public dist.
    const article = 'articles/' + post.slug + '/index.html';
    routes[route(article)] = [{at, body: await readFile(resolve(stage, article), 'utf8')}];
    for (const name of await readdir(resolve(stage, 'assets'))) {
      if (name.startsWith('guide-illustration-')) await cp(resolve(stage, 'assets', name), resolve('dist/assets', name));
    }
  }
} finally {
  await rm(stage, {recursive: true, force: true});
}
const meta = {version: 1, clock: config.publicationTimeKst || '08:17', builtAt: new Date().toISOString(),
  preparedThrough: [...posts.map(p => p.date), ...plan.map(r => r.post.date)].sort().at(-1),
  articles: [
    ...posts.filter(p => p.status === 'published').map(p => ({slug: p.slug, date: p.date, at: Date.parse(p.visibleAt || p.publishedAt || p.date + 'T00:00:00+09:00')})),
    ...plan.map(({post, at}) => ({slug: post.slug, date: post.date, at})),
  ]};
const pages = {routes, notFound: await readFile('dist/404.html', 'utf8')};
await mkdir('runtime', {recursive: true});
const pagesSource = 'export default ' + JSON.stringify(pages) + ';\n';
if (gzipSync(pagesSource).length > 2 * 1024 * 1024) throw Error('무료 실행 묶음 크기 한도를 초과합니다.');
await writeFile('runtime/publication-pages.generated.mjs', pagesSource);
await writeFile('runtime/publication-meta.generated.mjs', 'export default ' + JSON.stringify(meta) + ';\n');
await writeFile('dist/_routes.json', JSON.stringify({version: 1, include: [
  '/', '/index.html', '/sns', '/sns/*', '/contact', '/contact/*', '/topics/*', '/articles/*', '/sitemap.xml', '/feed.xml',
  '/api/comments', '/api/publication-status', '/about', '/about/', '/editorial', '/editorial/',
], exclude: []}) + '\n');
console.log(`Build complete: ${posts.length} archived articles, ${plan.length} reviewed timed articles; ${config.publicationTimeKst || '08:17'} Asia/Seoul. Timed HTML gzip: ${gzipSync(pagesSource).length} bytes. Paid API calls: 0.`);
