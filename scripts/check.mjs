import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
import {validateArticle} from './validate.mjs';
import {validatePublicationReview} from './publication-review.mjs';
import {mayRenderAd} from './ad-policy.mjs';
const posts=JSON.parse(await readFile('content/articles.json','utf8'));
const seen=new Set();for(const p of posts){validateArticle(p);assert(!seen.has(p.slug),'Duplicate slug');seen.add(p.slug)}
const queue=JSON.parse(await readFile('content/queue.json','utf8'));for(const p of queue){validateArticle(p);assert(!seen.has(p.slug),'Duplicate queued slug');seen.add(p.slug);assert(Number.isFinite(Date.parse(p.publishAt)),'Missing scheduled date')}
const reviews=JSON.parse(await readFile('content/publication-reviews.json','utf8'));
for(const p of queue){validatePublicationReview(p,reviews);assert(reviews[p.slug].comparedWith.every(slug=>seen.has(slug)),'Unknown comparison guide')}
const overrides=JSON.parse(await readFile('content/article-overrides.json','utf8'));
for(const [slug,value] of Object.entries(overrides)){const p=posts.find(p=>p.slug===slug);assert(p,'Unknown article override');validateArticle({...p,...value})}
const moderation=JSON.parse(await readFile('content/comment-moderation.json','utf8'));
assert.deepEqual(Object.keys(moderation),['hidden']);assert(moderation.hidden.length<=500);
assert(moderation.hidden.every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)));
const adReady={ads:{enabled:true,launchApproved:true,privacyReady:true,consentReady:true}};
const example=posts[0];
assert(mayRenderAd({config:adReady,path:'/articles/'+example.slug+'/',post:example,consentResolved:true}));
for(const path of ['/contact/','/privacy/','/sns/','/404.html','/about/','/editorial/','/topics/digital-cleanup/'])assert(!mayRenderAd({config:adReady,path,post:example,consentResolved:true}));
assert(!mayRenderAd({config:adReady,path:'/articles/'+example.slug+'/',post:example,consentResolved:false}));
const liveConfig=JSON.parse(await readFile('site.config.json','utf8'));
assert(!liveConfig.ads.enabled,'This release must keep ads disabled');
assert(!mayRenderAd({config:liveConfig,path:'/articles/'+example.slug+'/',post:example,consentResolved:true}));
const unreviewed=structuredClone(queue[0]);unreviewed.sections[0].paragraphs[0]+=' changed';
assert.throws(()=>validatePublicationReview(unreviewed,reviews),'Changed article must need a fresh review');
const root=resolve('dist');let htmlCount=0;const broken=[];
async function exists(path){try{await stat(path);return true}catch{return false}}
async function walk(dir){for(const d of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,d.name);if(d.isDirectory())await walk(file);else if(d.name.endsWith('.html')){htmlCount++;const html=await readFile(file,'utf8');if(file.startsWith(resolve(root,'articles')+sep))assert.equal((html.match(/<figure class=.guide-example.>/g)||[]).length,1,'Expected one body illustration: '+file);assert(html.includes('lang="ko"'),'Missing Korean language');assert(html.includes('<h1>'),'Missing H1');assert(!html.includes('undefined'),'Undefined content');assert(!/api\.openai\.com|googlesyndication\.com/.test(html),'Paid/tracking script unexpectedly present');for(const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){let target=resolve(root,'.'+m[1]);if(m[1].endsWith('/'))target=resolve(target,'index.html');if(!await exists(target))broken.push({file,target})}}}}
await walk(root);assert.deepEqual(broken,[],'Broken internal links');
const invalid=structuredClone(posts[0]);invalid.slug='../unsafe';assert.throws(()=>validateArticle(invalid));
const noSource=structuredClone(posts[0]);noSource.sources=[];assert.throws(()=>validateArticle(noSource));
const clickbait=structuredClone(posts[0]);clickbait.title='100% 수익 보장';assert.throws(()=>validateArticle(clickbait));
console.log(`Checks passed: ${posts.length} articles, ${htmlCount} HTML pages, internal links, sources, ${queue.length} content-bound reviews, moderation schema and ad exclusion/consent gates.`);
