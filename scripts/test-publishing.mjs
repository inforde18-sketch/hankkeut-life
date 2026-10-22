import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,cp,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
await mkdir('work',{recursive:true});
const temp=await mkdtemp(resolve('work','hankkeut-publish-test-'));
try{
await mkdir(resolve(temp,'scripts'));await mkdir(resolve(temp,'content'));
await cp('scripts/publish-due.mjs',resolve(temp,'scripts/publish-due.mjs'));await cp('scripts/validate.mjs',resolve(temp,'scripts/validate.mjs'));
await writeFile(resolve(temp,'site.config.json'),JSON.stringify({dailyPublishLimit:1}));
const sample=JSON.parse(await readFile('content/articles.json','utf8'))[0];
const article=(slug,extra={})=>({...structuredClone(sample),slug,status:'scheduled',publishAt:'2026-01-01T08:00:00+09:00',reviewed:true,sourcesChecked:true,rightsChecked:true,...extra});
const write=(name,data)=>writeFile(resolve(temp,'content',name),JSON.stringify(data));
const read=async name=>JSON.parse(await readFile(resolve(temp,'content',name),'utf8'));
const run=(args=[])=>{const r=spawnSync(process.execPath,['scripts/publish-due.mjs',...args],{cwd:temp,encoding:'utf8'});if(r.status!==0&&args.includes('--dry-run'))console.log(r.stderr||r.error);return r};
await write('articles.json',[]);await write('queue.json',[article('draft-only',{reviewed:false}),article('future-only',{publishAt:'2099-01-01T08:00:00+09:00'}),article('ready-first'),article('ready-second')]);
assert.equal(run(['--dry-run']).status,0);assert.equal((await read('articles.json')).length,0);
const firstRun=run();assert.equal(firstRun.status,0,firstRun.stderr||String(firstRun.error));assert.deepEqual((await read('articles.json')).map(p=>p.slug),['ready-first']);
assert.equal(run().status,0);assert.equal((await read('articles.json')).length,1,'Daily limit / rerun must not duplicate');
assert.equal((await read('queue.json')).length,3);
await write('articles.json',[sample]);await write('queue.json',[article(sample.slug)]);assert.notEqual(run().status,0,'Duplicate slug must fail');assert.equal((await read('queue.json')).length,1);
await write('queue.json',[article('bad-source',{sources:[]})]);assert.notEqual(run().status,0,'Missing source must fail');assert.equal((await read('articles.json')).length,1);
console.log('Publishing tests passed: dry-run, reviewed-only, future hold, daily cap, idempotency, duplicate and missing-source rejection.');
}finally{if(!temp.startsWith(resolve('work','hankkeut-publish-test-')))throw Error('Unexpected test folder');await rm(temp,{recursive:true,force:true})}
