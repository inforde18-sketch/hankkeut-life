import {readFile,writeFile,rename} from 'node:fs/promises';
import {validateArticle} from './validate.mjs';
const config=JSON.parse(await readFile('site.config.json','utf8'));
const posts=JSON.parse(await readFile('content/articles.json','utf8'));
const queue=JSON.parse(await readFile('content/queue.json','utf8'));
const dry=process.argv.includes('--dry-run');
const now=new Date();const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const count=posts.filter(p=>p.publishedAt&&new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(p.publishedAt))===day).length;
const room=Math.max(0,Math.min(1,config.dailyPublishLimit)-count);
const due=queue.filter(p=>p.status==='scheduled'&&p.reviewed===true&&p.sourcesChecked===true&&p.rightsChecked===true&&Number.isFinite(Date.parse(p.publishAt))&&new Date(p.publishAt)<=now).sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt)).slice(0,room);
const slugs=new Set(posts.map(p=>p.slug));
for(const p of due){validateArticle(p);if(slugs.has(p.slug))throw Error('중복된 글 주소: '+p.slug);slugs.add(p.slug)}
if(!dry&&due.length){for(const p of due){p.status='published';p.date=day;p.publishedAt=now.toISOString();posts.push(p)}const left=queue.filter(p=>!due.includes(p));await writeFile('content/articles.json.tmp',JSON.stringify(posts,null,2)+'\n');await writeFile('content/queue.json.tmp',JSON.stringify(left,null,2)+'\n');await rename('content/articles.json.tmp','content/articles.json');await rename('content/queue.json.tmp','content/queue.json')}
console.log(JSON.stringify({dryRun:dry,published:due.map(p=>p.slug),paidCalls:0,remaining:queue.length-due.length}));
