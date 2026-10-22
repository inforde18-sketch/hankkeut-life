import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
const config=JSON.parse(await readFile('site.config.json','utf8'));
const posts=JSON.parse(await readFile('content/articles.json','utf8'));
const base=(process.env.SITE_URL||config.url).replace(/\/$/,'');
const args=process.argv.slice(2),send=args.includes('--send');
const arg=k=>args[args.indexOf(k)+1];
const slug=args.includes('--slug')?arg('--slug'):null;
const channel=args.includes('--channel')?arg('--channel'):null;
const publicUrl=base&&/^https:\/\//.test(base);
const batch=posts.filter(p=>p.status==='published'&&(!slug||p.slug===slug)).map(p=>({slug:p.slug,title:p.title,facebook:`${p.title}\n\n${p.takeaway}\n\n자세한 확인 순서와 공식 출처는 본문에서 확인하세요.`,instagram:`${p.title}\n\n${p.takeaway}\n\n전체 가이드는 프로필의 사이트 링크에서 확인하세요.\n#한끗생활 #생활팁 #디지털생활`,link:publicUrl?`${base}/articles/${p.slug}/`:null,image:publicUrl?`${base}/assets/social/${p.slug}.jpg`:null}));
if(!send){await mkdir('social-export',{recursive:true});await writeFile('social-export/posts.json',JSON.stringify(batch,null,2)+'\n');console.log(`${batch.length}개 SNS 문구를 social-export/posts.json에 저장했습니다. 외부 게시: 0.`);process.exit(0)}
if(!config.social.enabled||!config.publicLaunch||!publicUrl)throw Error('공개 사이트와 SNS 계정 연결 후 사용할 수 있습니다.');
if(!slug||!['facebook','instagram'].includes(channel)||batch.length!==1)throw Error('--slug와 --channel facebook|instagram을 지정하세요.');
const version=process.env.META_GRAPH_VERSION;if(!/^v\d+\.\d+$/.test(version||''))throw Error('Meta 앱에서 지원되는 API 버전을 META_GRAPH_VERSION에 설정하세요.');
const token=process.env[channel==='facebook'?'FACEBOOK_PAGE_TOKEN':'INSTAGRAM_ACCESS_TOKEN'];
const id=process.env[channel==='facebook'?'FACEBOOK_PAGE_ID':'INSTAGRAM_ACCOUNT_ID'];
if(!token||!/^\d+$/.test(id||''))throw Error('해당 계정의 토큰과 ID를 안전한 환경 변수로 연결하세요.');
let state={};try{state=JSON.parse(await readFile('social-state.json','utf8'))}catch{}
const key=channel+':'+slug;if(state[key])throw Error('이 게시물은 전송 이력이 있습니다. 중복 게시하지 않습니다.');
// No automatic retry: a timeout can still mean the remote post was created.
// Keep a pending journal before any mutation; verify the account before clearing it.
state[key]={status:'pending',at:new Date().toISOString()};await writeFile('social-state.json',JSON.stringify(state,null,2));
async function api(path,data,method='POST'){
const host=channel==='instagram'?'graph.instagram.com':'graph.facebook.com';
const url=new URL(`https://${host}/${version}/${path}`);if(method==='GET')for(const [k,v]of Object.entries(data))url.searchParams.set(k,v);
const res=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:method==='POST'?new URLSearchParams(data):undefined,signal:AbortSignal.timeout(30000)});
if(!res.ok)throw Error(`Meta 요청 실패 (${res.status}). 토큰 권한·버전·계정 상태를 Meta 대시보드에서 확인하세요. 응답에 포함될 수 있는 비밀값은 출력하지 않았습니다.`);
return res.json();}
const p=batch[0];let result;
if(channel==='facebook')result=await api(`${id}/feed`,{message:p.facebook,link:p.link});
else{
await stat(`assets/social/${slug}.jpg`);
const imageResponse=await fetch(p.image,{method:'HEAD',signal:AbortSignal.timeout(10000)});if(!imageResponse.ok||!imageResponse.headers.get('content-type')?.includes('image/jpeg'))throw Error('Instagram 카드 이미지는 공개 HTTPS JPEG 주소여야 합니다.');
const container=await api(`${id}/media`,{image_url:p.image,caption:p.instagram});
state[key].containerId=container.id;await writeFile('social-state.json',JSON.stringify(state,null,2));
let ready=false;for(let i=0;i<12;i++){const status=await api(container.id,{fields:'status_code'},'GET');if(status.status_code==='FINISHED'){ready=true;break}if(['ERROR','EXPIRED'].includes(status.status_code))throw Error('미디어 처리 실패. Meta 계정에서 상태를 확인하세요.');await new Promise(r=>setTimeout(r,5000))}
if(!ready)throw Error('미디어 처리 확인 시간이 끝났습니다. 자동 재게시하지 않습니다.');
result=await api(`${id}/media_publish`,{creation_id:container.id});
}
state[key]={status:'published',id:result.id,at:new Date().toISOString()};await writeFile('social-state.json',JSON.stringify(state,null,2));console.log(`${channel}: 게시 완료 (${result.id})`);
