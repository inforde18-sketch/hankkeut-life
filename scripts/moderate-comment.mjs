import {readFile,writeFile} from 'node:fs/promises';
const [action,id]=process.argv.slice(2);
if(!['hide','restore'].includes(action)||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||''))throw Error('사용법: node scripts/moderate-comment.mjs hide|restore 댓글-UUID');
const file='content/comment-moderation.json';
const data=JSON.parse(await readFile(file,'utf8'));const hidden=new Set(data.hidden);
if(action==='hide')hidden.add(id.toLowerCase());else hidden.delete(id.toLowerCase());
if(hidden.size>500)throw Error('500개 이상은 운영자가 D1에서 일괄 검토해야 합니다.');
await writeFile(file,JSON.stringify({hidden:[...hidden].sort()},null,2)+'\n');
console.log('댓글 ID만 기록했습니다. 본문·닉네임·신고 내용은 공개 저장소에 넣지 않습니다. 저장소 반영과 배포 확인 후 적용됩니다.');
