import {readFile} from 'node:fs/promises';
const pool=JSON.parse(await readFile('content/topic-pool.json','utf8'));
const scored=pool.map(p=>({...p,score:p.readerValue*3+p.evergreen*2-p.risk*3})).sort((a,b)=>b.score-a.score);
console.log(JSON.stringify({mode:'무료 규칙 기반 주제 후보 정렬 — AI 생성 아님',paidCalls:0,topics:scored},null,2));
