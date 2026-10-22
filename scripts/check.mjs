import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {validateArticle} from './validate.mjs';
const posts=JSON.parse(await readFile('content/articles.json','utf8'));
const seen=new Set();for(const p of posts){validateArticle(p);assert(!seen.has(p.slug),'Duplicate slug');seen.add(p.slug)}
const queue=JSON.parse(await readFile('content/queue.json','utf8'));for(const p of queue){validateArticle(p);assert(!seen.has(p.slug),'Duplicate queued slug');seen.add(p.slug);assert(Number.isFinite(Date.parse(p.publishAt)),'Missing scheduled date')}
const root=resolve('dist');let htmlCount=0;const broken=[];
async function exists(path){try{await stat(path);return true}catch{return false}}
async function walk(dir){for(const d of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,d.name);if(d.isDirectory())await walk(file);else if(d.name.endsWith('.html')){htmlCount++;const html=await readFile(file,'utf8');assert(html.includes('lang="ko"'),'Missing Korean language');assert(html.includes('<h1>'),'Missing H1');assert(!html.includes('undefined'),'Undefined content');assert(!/api\.openai\.com|googlesyndication\.com/.test(html),'Paid/tracking script unexpectedly present');for(const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){let target=resolve(root,'.'+m[1]);if(m[1].endsWith('/'))target=resolve(target,'index.html');if(!await exists(target))broken.push({file,target})}}}}
await walk(root);assert.deepEqual(broken,[],'Broken internal links');
const invalid=structuredClone(posts[0]);invalid.slug='../unsafe';assert.throws(()=>validateArticle(invalid));
const noSource=structuredClone(posts[0]);noSource.sources=[];assert.throws(()=>validateArticle(noSource));
const clickbait=structuredClone(posts[0]);clickbait.title='100% 수익 보장';assert.throws(()=>validateArticle(clickbait));
console.log(`Checks passed: ${posts.length} articles, ${htmlCount} HTML pages, internal links, source fields, unsafe slug and prohibited-title guards.`);
