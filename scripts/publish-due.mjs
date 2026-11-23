import {readFile, writeFile, rename} from 'node:fs/promises';
import {publicationPlan} from './publication-plan.mjs';

const read = async name => JSON.parse(await readFile(name, 'utf8'));
const [config, posts, queue, reviews] = await Promise.all([
  'site.config.json', 'content/articles.json', 'content/queue.json', 'content/publication-reviews.json',
].map(read));
const now = Date.now(), dry = process.argv.includes('--dry-run');
// Edge time controls visibility. This job only reconciles source records later.
const due = publicationPlan(config, posts, queue, reviews).filter(r => r.at <= now);
if (!dry && due.length) {
  const released = new Set(due.map(r => r.post.slug));
  const archived = due.map(({post, at}) => ({...post, status: 'published',
    publishedAt: new Date(at).toISOString(), visibleAt: new Date(at).toISOString(), archivedAt: new Date(now).toISOString()}));
  await writeFile('content/articles.json.tmp', JSON.stringify([...posts, ...archived], null, 2) + '\n');
  await writeFile('content/queue.json.tmp', JSON.stringify(queue.filter(p => !released.has(p.slug)), null, 2) + '\n');
  await rename('content/articles.json.tmp', 'content/articles.json');
  await rename('content/queue.json.tmp', 'content/queue.json');
}
console.log(JSON.stringify({dryRun: dry, published: due.map(r => r.post.slug), mode: 'archive-time-gated-releases', paidCalls: 0, remaining: queue.length - due.length}));
