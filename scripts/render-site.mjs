import {readFile,writeFile,mkdir,cp,rm,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {publicationPlan} from './publication-plan.mjs';
import {buildGuideIllustration} from './guide-illustrations.mjs';
import {reviewHtml,gmailTool,contactForm,verificationHtml} from './quality-ui.mjs';
import {privacyHtml} from './privacy-ui.mjs';
import {assertAdsRemainDisabled} from './ad-policy.mjs';
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const config=JSON.parse(await readFile('site.config.json','utf8'));
const sourceArticles=JSON.parse(await readFile('content/articles.json','utf8'));
const editorialTitles=JSON.parse(await readFile('content/editorial-titles.json','utf8'));
const overrides=JSON.parse(await readFile('content/article-overrides.json','utf8'));
const verificationRecords=JSON.parse(await readFile('content/verification-records.json','utf8'));
const scheduledArticles=JSON.parse(await readFile('content/queue.json','utf8'));
const stageTime=process.env.HANKKEUT_RENDER_AT ? Date.parse(process.env.HANKKEUT_RENDER_AT) : null;
if(stageTime!==null&&!Number.isFinite(stageTime))throw Error('잘못된 렌더링 시각');
const stagePlan=stageTime===null?[]:publicationPlan(config,sourceArticles,scheduledArticles,JSON.parse(await readFile('content/publication-reviews.json','utf8')));
const rawArticles=[...sourceArticles,...stagePlan.filter(r=>r.at<=stageTime).map(({post,at})=>({...post,status:'published',publishedAt:new Date(at).toISOString()}))];
const allSlugs=new Set([...rawArticles,...scheduledArticles].map(p=>p.slug));
const articles=rawArticles.map(p=>({...p,...overrides[p.slug],title:editorialTitles[p.slug]||p.title,searchAliases:editorialTitles[p.slug]?[p.title]:[]}));
const guideNotes=JSON.parse(await readFile('content/guide-notes.json','utf8'));
const topicPaths={'디지털 정리':'digital-cleanup','계정 보안':'account-security','안전한 인터넷':'safe-internet'};
const topicInfo={
  '디지털 정리':{intro:'지우기 전에, 무엇을 정리하는지부터 구분합니다. 기기 공간·브라우저 기록·메일 받은편지함은 서로 다른 대상입니다.',steps:[['휴대전화 공간이 부족해요','phone-storage-before-delete'],['PC에 받은 파일을 정리하고 싶어요','chrome-download-history-vs-files'],['받은편지함에서 메일이 안 보여요','gmail-archive-find-again']]},
  '계정 보안':{intro:'비밀번호, 로그인 인증, 기기 세션, 외부 앱 연결을 나누어 살펴봅니다. 하나의 목록으로 모든 접근 권한을 판단하지 않습니다.',steps:[['같은 비밀번호를 여러 곳에 써요','different-passwords'],['로그인 설정을 더 확인하고 싶어요','google-two-step'],['모르는 기기나 앱 연결이 보여요','google-device-sessions-review']]},
  '안전한 인터넷':{intro:'링크의 목적지, 브라우저 기능의 범위, 확장 프로그램의 상태를 읽습니다. 모양이 익숙하다는 사실만으로 안전하다고 단정하지 않습니다.',steps:[['예상하지 못한 QR을 받았어요','qr-check-before-open'],['시크릿 창에서 무엇이 남나요?','chrome-incognito-limits'],['확장 프로그램 아이콘이 안 보여요','chrome-extension-hide-vs-disable']]}
};
for(const [slug,n] of Object.entries(guideNotes)){
  if(!allSlugs.has(slug)||!/^\d{4}-\d{2}-\d{2}$/.test(n.updated)||!n.scope||!n.heading||!n.stuck||(n.includeExample!==false&&(!n.exampleTitle||!Array.isArray(n.example)||n.example.length<2))||!Array.isArray(n.rows)||n.rows.length<3||n.rows.some(r=>r.length!==3||r.some(v=>typeof v!=='string'||!v.trim()))||!Array.isArray(n.related)||n.related.some(x=>!allSlugs.has(x)||x===slug))throw Error('Invalid guide notes: '+slug);
}
const noteHtml=p=>{const n=guideNotes[p.slug];return n?`<section id="guide-notes" class="guide-notes article-body"><span class="eyebrow">상황별로 적용하기</span><h2>${esc(n.heading)}</h2><p class="guide-caption">본문의 공식 안내를 적용하는 데 도움이 되도록 편집한 비교표입니다.</p><div class="comparison-wrap" tabindex="0" role="region" aria-label="${esc(n.heading)} 비교표"><table class="comparison"><thead><tr><th scope="col">지금 상황</th><th scope="col">먼저 확인할 것</th><th scope="col">놓치기 쉬운 차이</th></tr></thead><tbody>${n.rows.map(r=>`<tr>${r.map((c,i)=>`<${i?'td':'th scope="row"'}>${esc(c)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>${n.includeExample===false?'':`<section class="worked-example"><span class="eyebrow">편집부가 구성한 가상 예시</span><h2>${esc(n.exampleTitle)}</h2>${n.example.map(t=>`<p>${esc(t)}</p>`).join('')}</section>`}<section><h2>여기서 해결되지 않았다면</h2><p>${esc(n.stuck)}</p></section><p class="guide-caption">내용 보완 ${esc(n.updated)} · 비교표${n.includeExample===false?'':'와 가상 사례'}는 편집부의 적용 안내입니다.</p></section>`:''};
const socialFiles=new Set(await readdir('assets/social'));
const guideFiles=new Set(await readdir('assets'));
const guideImage=(post,cls='')=>{
  const standard='preview-'+post.slug+'.jpg';
  const compact='preview-small-'+post.slug+'.jpg';
  const sizes=cls==='feature-image'?'(max-width: 760px) calc(100vw - 36px), 600px':cls==='article-guide-image'?'(max-width: 760px) calc(100vw - 36px), 830px':'(max-width: 760px) calc((100vw - 56px)/2), 370px';
  const variants=socialFiles.has(compact)?' srcset="/assets/social/'+esc(compact)+' 640w, /assets/social/'+esc(standard)+' 1200w" sizes="'+sizes+'"':'';
  return '<img class="guide-image '+cls+'" src="/assets/social/'+esc(standard)+'"'+variants+' alt="" width="1200" height="630" loading="'+(cls==='feature-image'?'eager':'lazy')+'">';
};
const deviceRules=[
  [/^(?:android-|google-photos-)/,'Android'],
  [/^phone-storage-/,'Android · iPhone'],
  [/^(?:windows-|onedrive-)/,'Windows PC'],
  [/^(?:chrome-|firefox-|edge-|gmail-|google-docs-|google-drive-)/,'PC 웹'],
];
const deviceBadge=post=>{
  const label=deviceRules.find(([pattern])=>pattern.test(post.slug))?.[1];
  return label?'<span class="device-badge">'+esc(label)+'</span>':'';
};
const settingExamples={
  'windows-zip-extract-one-vs-all':[0,'guide-example-windows-zip-results.svg',760,318,'같은 ZIP에서 하나만 추출한 폴더에는 agenda.txt 한 개, 전체를 추출한 폴더에는 agenda.txt, checklist.txt, notes.txt 세 개','Windows에서 직접 비교한 결과를 정리했습니다. 같은 이름의 agenda.txt는 두 폴더에서 원본과 일치했습니다.'],
  'gmail-find-pdf-with-filename':[0,'capture-gmail-query-helper.png',664,738,'한끗생활 검색식 도우미에 가상 조건을 넣어 만든 검색식 화면','한끗생활 검색식 도우미의 실제 작동 화면입니다. 아래에서 같은 조건을 직접 바꿔 볼 수 있습니다.'],
  'gmail-block-vs-unsubscribe':[0,'capture-gmail-block-setting.jpg',800,315,'실제 Gmail 설정의 필터 및 차단된 주소 탭과 스팸 분류 안내','실제 설정 화면은 차단한 발신자의 메일이 스팸으로 표시된다고 안내합니다. 주소 목록과 계정 영역은 제외했습니다.'],
  'google-docs-version-copy-before-restore':[1,'capture-docs-version-menu.jpg',800,650,'새 예제 Google Docs 문서에서 실제로 열린 파일과 버전 기록 하위 메뉴','예제 문서에서 파일 → 버전 기록을 펼친 실제 화면입니다. 현재 버전 이름 지정과 버전 기록 보기가 따로 표시됩니다.'],
  'android-app-permission-check':[0,'guide-example-android-permissions.svg',360,224,'Android 설정에서 앱을 선택한 뒤 앱 정보의 권한 메뉴를 누르는 예시','Android 설정에서 앱을 선택한 뒤 ‘권한’을 확인하세요. 메뉴 위치는 기기마다 다를 수 있습니다.'],
  'windows-clipboard-pinned-items':[1,'guide-example-windows-clipboard.svg',360,236,'Windows 키와 V로 연 클립보드의 예시 항목에 고정 표시가 있는 그림','고정한 항목은 클립보드 기록에서 ‘모두 지우기’를 눌러도 남습니다.'],
  'qr-check-before-open':[1,'guide-example-qr-address.svg',360,230,'QR 미리보기 주소 https://example.com/parcel에서 example.com 부분을 강조한 예시','QR 링크를 열기 전에 표시된 웹사이트 이름과 공식 주소의 철자를 비교하세요.'],
};
const guideIllustration=post=>{
  const example=settingExamples[post.slug];
  if(!example||!guideFiles.has(example[1]))return buildGuideIllustration(post,esc);
  const [section,file,width,height,alt,caption]=example;
  return {section,file,width,height,alt,caption};
};
const guideIllustrationHtml=({section,file,width,height,alt,caption},index)=>{
  if(section!==index)return '';
  const serviceCapture=/^capture-(?:gmail-block-setting|docs-version-menu)\.jpg$/.test(file);
  const capture=serviceCapture||/^guide-example-(?:gmail|docs)\.jpg$/.test(file);
  const ownCapture=file==='capture-gmail-query-helper.png';
  const kind=file==='guide-example-windows-zip-results.svg'?'실측 결과를 재구성한 도식 · 파일 탐색기 화면 캡처가 아닙니다.':ownCapture?'실제 캡처: 한끗생활 도우미 · Firefox 153 / Windows · 2026-11-16. example.com 가상 주소 사용. Gmail 서비스 자체의 화면은 아닙니다.':serviceCapture?'실제 서비스 화면 · ChatGPT 앱 안 브라우저 / Windows / 한국어 · 2026-11-16. 계정·메일 주소·개인 메일 목록은 제외했습니다.':capture?'실제 서비스 화면 부분 캡처 · 기존 확인 자료. 메뉴 위치는 현재 버전과 다를 수 있습니다.':'설명용 도식 · 실제 앱 화면 캡처가 아닙니다.';
  return `<figure class="guide-example"><div class="capture-scroll" tabindex="0" role="region" aria-label="본문 이미지. 좌우로 이동하거나 크게 보기로 열 수 있습니다."><img src="/assets/${esc(file)}" width="${width}" height="${height}" alt="${esc(alt)}" loading="lazy"${capture||ownCapture?` style="min-width:${Math.round(width*(capture&&!serviceCapture?1.2:1))}px;max-width:none"`:''}></div><figcaption>${esc(caption)}<span class="capture-details">${kind}${capture||ownCapture?' 작은 화면에서는 이미지를 좌우로 넘기거나 크게 보기를 이용하세요.':''}</span><a class="capture-link" href="/assets/${esc(file)}" target="_blank" rel="noopener noreferrer">이미지 크게 보기 ↗</a></figcaption></figure>`;
};
const commentsHtml = (post) => `<section class="article-comments" data-comments="${esc(post.slug)}" aria-labelledby="comments-heading">
  <h2 id="comments-heading">댓글</h2>
  <p id="comments-rules">로그인 없이 댓글을 남길 수 있어요. 등록하면 닉네임과 댓글이 바로 공개됩니다. 링크, 연락처, 개인정보, 욕설은 입력하지 마세요.</p>
  <form method="post" aria-describedby="comments-rules" hidden>
    <label for="comment-nickname">닉네임</label>
    <input id="comment-nickname" name="nickname" type="text" minlength="2" maxlength="20" autocomplete="nickname" placeholder="2~20자" required>
    <label for="comment-body">댓글 내용</label>
    <textarea id="comment-body" name="body" rows="4" maxlength="500" placeholder="이 글에 대한 생각을 남겨주세요 (최대 500자)" required></textarea>
    <div hidden><label for="comment-website">웹사이트</label><input id="comment-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    <button type="submit">댓글 등록</button>
    <p data-submit-status role="status"></p>
  </form>
  <noscript><p>댓글을 보거나 남기려면 브라우저에서 자바스크립트를 켜 주세요.</p></noscript>
  <p data-list-status role="status"></p>
  <ol aria-label="최근 댓글 최대 50개"></ol>
  <details id="report-guide" hidden>
    <summary>이 글 정정 요청·신고</summary>
    <form aria-describedby="report-hint">
      <p id="report-hint">신고 내용은 운영자에게만 보입니다. 연락처, 비밀번호, 인증번호 등은 입력하지 마세요.</p>
      <p data-report-target>신고 대상: 이 글</p>
      <label for="report-reason">신고 이유</label>
      <select id="report-reason" name="reason"><option>내용 오류</option><option>댓글 문제</option><option>개인정보 노출</option><option>기타</option></select>
      <label for="report-note">간단한 설명 (선택)</label>
      <textarea id="report-note" name="note" rows="3" maxlength="300"></textarea>
      <div hidden><label for="report-website">웹사이트</label><input id="report-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <button type="submit">비공개로 보내기</button>
      <p data-report-status role="status"></p>
    </form>
  </details>
</section>`;
const now=new Date(stageTime===null?Date.now():stageTime);
const posts=articles.filter(p=>p.status==='published'&&new Date(p.date+'T00:00:00+09:00')<=now).sort((a,b)=>(b.publishedAt||b.date).localeCompare(a.publishedAt||a.date));
const assetVersion=async name=>createHash('sha256').update(await readFile('assets/'+name)).digest('hex').slice(0,10);
const [styleVersion,appVersion,commentStyleVersion,commentAppVersion,qualityStyleVersion,qualityScriptVersion]=await Promise.all(['style.css','app.js','comments.css','comments.js','quality.css','quality.js'].map(assetVersion));
const origin=process.env.SITE_URL||config.url;
if(origin&&(!/^https:\/\/[^/]+\/?$/.test(origin)))throw Error('SITE_URL에는 https 사이트 기본 주소만 입력하세요.');
const base=origin.replace(/\/$/,'');
if(config.publicLaunch&&(!base||!(config.contactEmail||config.contactUrl)||!config.operatorName))throw Error('공개 전 사이트 주소, 운영자 표시명, 문의 채널이 필요합니다.');
if(config.contactUrl&&!/^https:\/\/github\.com\/inforde18-sketch\/hankkeut-life\/issues\/?$/.test(config.contactUrl))throw Error('확인된 문의 채널 주소를 사용하세요.');
assertAdsRemainDisabled(config);
if(config.ads.client&&!/^ca-pub-\d{16}$/.test(config.ads.client))throw Error('올바른 Google AdSense 게시자 번호가 필요합니다.');
const dist=resolve(process.env.HANKKEUT_RENDER_OUTPUT||'dist');
if(dirname(dist)!==process.cwd())throw Error('잘못된 출력 경로');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await cp('assets',resolve(dist,'assets'),{recursive:true});
await writeFile(resolve(dist,'_routes.json'),JSON.stringify({version:1,include:['/api/comments','/about','/about/','/editorial','/editorial/'],exclude:[]})+'\n');
const cats=['전체','디지털 정리','계정 보안','안전한 인터넷'];
const jsonld=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const art=(kind,cls='')=>`<div class="art ${esc(kind)} ${cls}" aria-hidden="true"><div class="art-grid"></div>${kind==='storage'?'<div class="phone"><div class="speaker"></div><div class="phone-label">저장 공간</div><div class="ring"><span>정리할<br><b>시간</b></span></div><div class="phone-line"></div><div class="phone-line short"></div><div class="phone-pill">가볍게, 다시 시작</div></div><span class="floating a">다운로드 ↓</span><span class="floating b">사진은 소중하니까</span>':kind==='qr'?'<div class="qr-box"><svg viewBox="0 0 100 100"><path d="M10 10h27v27H10zm53 0h27v27H63zM10 63h27v27H10z" fill="none" stroke="currentColor" stroke-width="7"/><path d="M20 20h7v7h-7zm53 0h7v7h-7zM20 73h7v7h-7zM47 10h7v20h-7zm0 30h17v9H47zm26 5h17v8H73zM45 58h10v15H45zm20 5h10v25H65zm16 7h9v20h-9zM43 83h12v7H43z" fill="currentColor"/></svg></div><span class="graphic-label">열기 전, 한 번 더</span>':kind==='password'?'<div class="password-box"><span>나만의 비밀번호</span><strong>● ● ● ● ● ●</strong><div class="strength"><i></i><i></i><i></i><i></i></div></div><span class="graphic-label">계정마다 다르게</span>':kind==='shield'?'<div class="shield-icon">✓</div><span class="graphic-label">한 단계 더 든든하게</span>':'<div class="browser-box"><div><i></i><i></i><i></i></div><span>cache</span><b>↻</b></div><span class="graphic-label">가볍게 새로고침</span>'}</div>`;
function shell({title,description,path='/',body,post,isHome=false}){
const canonical=base?base+path:'';
const shareImage=base+(post?'/assets/social/preview-'+post.slug+'.jpg':'/assets/share.png');
return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${isHome&&config.publicLaunch?'<meta name="google-site-verification" content="TK2406tZdOqndu0ZKG3pv3uTfH4sKfI5Fe72ixJO9Z8">':''}<title>${esc(title)} · 한끗생활</title><meta name="description" content="${esc(description)}">${!config.publicLaunch?'<meta name="robots" content="noindex,nofollow">':''}${canonical?`<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}">`:''}<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${post?'article':'website'}"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="한끗생활">${base?`<meta property="og:image" content="${esc(shareImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`:''}<meta name="theme-color" content="#124c42"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/style.css?v=${styleVersion}"><link rel="stylesheet" href="/assets/quality.css?v=${qualityStyleVersion}"><link rel="alternate" type="application/rss+xml" href="/feed.xml" title="한끗생활 새 글"><script defer src="/assets/app.js?v=${appVersion}"></script><script defer src="/assets/quality.js?v=${qualityScriptVersion}"></script>${post?`<link rel="stylesheet" href="/assets/comments.css?v=${commentStyleVersion}"><script defer src="/assets/comments.js?v=${commentAppVersion}"></script>`:''}${post&&base?`<script type="application/ld+json">${jsonld({'@context':'https://schema.org','@type':'Article',headline:post.title,description:post.summary,datePublished:post.publishedAt||post.date+'T09:00:00+09:00',dateModified:[post.date,guideNotes[post.slug]?.updated].filter(Boolean).sort().at(-1),mainEntityOfPage:canonical,image:shareImage,author:{'@type':'Organization',name:'한끗생활'},publisher:{'@type':'Organization',name:'한끗생활'}})}</script>`:''}</head><body><a class="skip" href="#main">본문으로 건너뛰기</a><header class="header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="한끗생활 홈"><span class="brand-mark">ㅎ<span>↗</span></span><strong>한끗생활<span>알아두면 달라지는 하루</span></strong></a><nav aria-label="주요 메뉴"><a href="/#latest">최신 글</a><a href="/topics/digital-cleanup/">디지털 정리</a><a href="/topics/account-security/">계정 보안</a><a href="/topics/safe-internet/">안전한 인터넷</a></nav><a class="search-link" href="/#search" aria-label="글 검색">⌕ <span>검색</span></a></div></header>${body}<footer class="footer"><div class="wrap"><div class="footer-top"><a class="brand footer-brand" href="/">한끗생활<span>일상을 바꾸는 작은 차이.</span></a><div class="footer-links"><a href="/sns/">SNS에서 본 글</a><a href="/privacy/">개인정보 처리 안내</a><a href="/contact/">문의·정정 요청</a></div></div><div class="footer-bottom"><span>© ${now.getFullYear()} 한끗생활</span><span>과장 없이, 출처와 함께.</span></div></div></footer><div class="toast" role="status" aria-live="polite"></div></body></html>`;
}
const searchIndex=p=>esc([p.slug,p.title,p.summary,p.category,p.takeaway,...(p.searchAliases||[]),...p.sections.map(section=>section.heading)].join(' '));
const card=(p)=>`<article class="card" data-card data-category="${esc(p.category)}" data-slug="${esc(p.slug)}" data-search="${searchIndex(p)}"><a class="card-image" href="/articles/${p.slug}/" tabindex="-1" aria-hidden="true">${guideImage(p)}</a><div class="card-content"><div class="card-top"><span class="category">${esc(p.category)}</span><button class="save" type="button" data-save="${p.slug}" aria-label="${esc(p.title)} 저장" aria-pressed="false">♧</button></div><h3><a href="/articles/${p.slug}/">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p><div class="meta"><time datetime="${p.date}">${p.date.replaceAll('-','.').slice(2)}</time><span>${p.minutes}분 읽기</span></div></div></article>`;
const featured=posts[0];
if(!featured)throw Error('발행된 기사가 없습니다.');
const testedGuideSlugs=['windows-zip-extract-one-vs-all','google-docs-version-copy-before-restore','gmail-block-vs-unsubscribe'];
const testedGuideList=testedGuideSlugs.map(slug=>posts.find(post=>post.slug===slug)).filter(Boolean);
const testedGuides=testedGuideList.length?`<section class="wrap topic-entry" aria-labelledby="tested-guides"><div class="section-head"><div><span class="eyebrow">확인한 범위를 공개합니다</span><h2 id="tested-guides">직접 확인한 가이드</h2></div></div><div class="topic-grid">${testedGuideList.map(p=>`<a class="topic-tile" href="/articles/${esc(p.slug)}/"><span class="category">${esc(p.category)}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><span>확인 기록 보기 →</span></a>`).join('')}</div></section>`:'';
const home=`<main id="main"><section class="intro wrap"><div class="intro-top"><span class="eyebrow">THE SMALL THINGS, BETTER.</span><span class="edition">작은 습관을 위한 생활 가이드 <span>↗</span></span></div><h1>매일의 생활에,<br><span>쓸모 있는 한 끗.</span></h1><p>복잡한 정보는 덜고, 지금 필요한 방법만.<br class="mobile-break"> 읽고 나면 하나는 바뀌는 생활 가이드.</p><a class="home-search-cta" href="#search">⌕ 글 검색</a></section><section class="wrap featured" aria-label="오늘의 가이드"><div class="featured-copy"><span class="feature-tag"><i></i> 오늘의 한 끗</span><span class="category">${esc(featured.category)}</span><h2><a href="/articles/${featured.slug}/">${esc(featured.title)}</a></h2><p>${esc(featured.summary)}</p><a class="primary-link" href="/articles/${featured.slug}/">지금 확인하기 <span>↗</span></a><div class="feature-bottom">공식 출처 확인 <span>·</span> ${featured.minutes}분 읽기</div></div><a class="featured-art" href="/articles/${featured.slug}/" aria-label="${esc(featured.title)} 읽기">${guideImage(featured,'feature-image')}</a></section>${testedGuides}<section class="wrap topic-entry" aria-label="상황에 맞는 가이드 찾기"><div class="section-head"><div><span class="eyebrow">어디서 시작할까요?</span><h2>지금 필요한 정리부터</h2></div></div><div class="topic-grid">${Object.entries(topicInfo).map(([cat,t])=>`<a class="topic-tile" href="/topics/${topicPaths[cat]}/"><span class="category">${esc(cat)}</span><h3>${esc(t.steps[0][0])}</h3><p>${esc(t.intro)}</p><span>상황별 가이드 찾기 →</span></a>`).join('')}</div></section><section class="wrap latest" id="latest"><div class="section-head"><div><span class="eyebrow">READ & TRY</span><h2>하나씩 알아가는 생활</h2></div><span class="post-count" role="status">${posts.length}개의 가이드</span></div><div class="filter-bar"><div class="chips" aria-label="주제 선택">${cats.map((c,i)=>`<button type="button" data-filter="${esc(c)}" aria-pressed="${i===0}" class="chip${i===0?' active':''}">${c}</button>`).join('')}<button class="chip" type="button" data-filter="저장한 글" aria-pressed="false">저장한 글</button></div><label class="search" id="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="궁금한 생활 팁 검색" aria-label="기사 검색" maxlength="100"></label></div><div class="cards">${posts.map(card).join('')}</div><p class="empty" hidden>조건에 맞는 글이 없습니다. 다른 검색어나 주제를 선택해 보세요.</p></section><section class="wrap promise"><div class="promise-mark">↗</div><div><span class="eyebrow">OUR PROMISE</span><h2>눈길을 끄는 제목, 끝까지 쓸모 있는 내용.</h2><p>한끗생활은 공식 출처를 확인하고, 실행할 수 있는 방법을 정리합니다.<br>제목에서 한 약속은 본문에서 지킵니다.</p></div></section></main>`;
await writeFile(resolve(dist,'index.html'),shell({isHome:true,title:'알아두면 달라지는 하루',description:'디지털 정리, 계정 보안, 안전한 인터넷. 공식 출처와 함께 읽는 한국어 생활 가이드.',body:home}));
const quickChecks={
  'phone-storage-before-delete':[0,'기기 설정에서 저장 공간 사용량을 확인하세요.'],
  'qr-check-before-open':[1,'QR을 스캔한 뒤 열기 전에 미리보기 주소를 확인하세요.'],
  'different-passwords':[0,'먼저 이메일 계정의 비밀번호를 다른 계정과 구분하세요.'],
  'google-two-step':[1,'Google 계정 → 보안 및 로그인 → 2단계 인증'],
  'firefox-cache-only':[1,'Firefox 설정 → 개인 정보 및 보안에서 캐시 정리 항목 확인'],
  'android-notification-cleanup':[0,'알림을 보낸 앱을 확인한 뒤 기기 설정에서 해당 앱의 알림을 살펴보세요.'],
  'android-app-permission-check':[0,'Android 설정 → 앱 → 확인할 앱 → 권한'],
  'google-connected-apps-review':[0,'Google 계정에서 서드 파티 앱 및 서비스 연결 목록을 확인하세요.'],
  'chrome-site-notifications-check':[1,'PC Chrome 설정 → 개인 정보 보호 및 보안 → 사이트 설정 → 알림'],
  'chrome-download-history-vs-files':[1,'PC Chrome 더보기 → 다운로드 → 해당 파일의 저장 위치 확인'],
  'google-device-sessions-review':[0,'Google 계정 → 보안 및 로그인 → 내 기기 → 모든 기기 관리'],
  'chrome-incognito-limits':[1,'시크릿 창을 닫은 뒤 다운로드 폴더와 북마크를 확인하세요.'],
  'gmail-archive-find-again':[1,'Gmail 메뉴 → 전체보관함 또는 상단 검색'],
  'chrome-extension-hide-vs-disable':[0,'PC Chrome 더보기 → 확장 프로그램 → 확장 프로그램 관리'],
  'windows-clipboard-pinned-items':[0,'Windows 키 + V → 클립보드 기록과 고정 항목 확인'],
  'google-docs-version-copy-before-restore':[1,'PC Google Docs에서 오른쪽 위 버전 기록을 열고 이전 내용을 비교하세요.'],
  'gmail-block-vs-unsubscribe':[1,'PC Gmail 설정 → 모든 설정 보기 → 필터 및 차단된 주소'],
};

const quickGuide=post=>{
  const [index,oldPath]=quickChecks[post.slug]||[0,''];
  const path=guideNotes[post.slug]?.path||oldPath;
  return `<aside class="takeaway quick-guide" aria-label="빠른 답변"><span>빠른 답변</span><p>${esc(post.takeaway)}</p>${path?`<p class="quick-path">${esc(path)}</p>`:''}<a class="text-link" href="#section-${index}">확인 순서 보기 ↓</a></aside>`;
};

const serviceGroup=slug=>{
  if(/^google-(?:docs|drive)-/.test(slug))return 'google-documents';
  if(/^google-(?:two-step|connected-apps|device-sessions|backup-codes)(?:-|$)/.test(slug))return 'google-account';
  return slug.split('-')[0];
};

const relatedGuides=post=>{
  const sameService=posts.filter(candidate=>candidate.slug!==post.slug&&serviceGroup(candidate.slug)===serviceGroup(post.slug));
  const editorial=(guideNotes[post.slug]?.related||[]).map(slug=>posts.find(candidate=>candidate.slug===slug)).filter(Boolean);
  const suggested=[...new Set([...sameService,...editorial])].slice(0,2);
  const links=suggested.length?`<ul>${suggested.map(candidate=>`<li><a href="/articles/${esc(candidate.slug)}/">${esc(candidate.title)} →</a></li>`).join('')}</ul>`:'';
  const topic=suggested.length<2?`<a class="text-link" href="/topics/${topicPaths[post.category]}/">${esc(post.category)} 글 더 보기 →</a>`:'';
  return `<section class="related-guides" aria-labelledby="related-guides-heading"><h2 id="related-guides-heading">이어서 읽기</h2>${links}${topic}</section>`;
};

for(const p of posts){
const path='/articles/'+p.slug+'/';
const illustration=guideIllustration(p);
if(illustration.svg)await writeFile(resolve(dist,'assets',illustration.file),illustration.svg);
const body=`<main id="main" class="wrap article-layout reader-layout"><article class="article"><div class="breadcrumb"><a href="/">홈</a><span>/</span><a href="/topics/${topicPaths[p.category]}/">${esc(p.category)}</a></div><div class="article-labels"><span class="category">${esc(p.category)}</span>${deviceBadge(p)}</div><h1>${esc(p.title)}</h1>${quickGuide(p)}<p class="dek">${esc(p.summary)}</p><div class="byline"><span class="author-icon">ㅎ</span><span>한끗생활 편집<span class="byline-sub">AI 작성 지원 · 공식 출처 확인</span></span><time datetime="${p.date}">${p.date.replaceAll('-','.')} · ${p.minutes}분 읽기</time></div>${reviewHtml(p,guideNotes[p.slug],esc)}${guideImage(p,'article-guide-image')}${guideNotes[p.slug]?`<p class="guide-scope"><strong>이 글의 범위</strong> ${esc(guideNotes[p.slug].scope)}</p>`:''}<nav class="toc" aria-label="이 글의 순서"><strong>이 글의 순서</strong><ol>${p.sections.map((s,i)=>`<li><a href="#section-${i}">${esc(s.heading)}</a></li>`).join('')}${guideNotes[p.slug]?'<li><a href="#guide-notes">상황별 비교표와 적용 예시</a></li>':''}</ol></nav><div class="article-body">${p.sections.map((s,i)=>`<section id="section-${i}"><h2>${esc(s.heading)}</h2>${s.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}${guideIllustrationHtml(illustration,i)}</section>`).join('')}</div>${noteHtml(p)}${p.slug==='gmail-find-pdf-with-filename'?gmailTool:''}${verificationHtml(verificationRecords[p.slug],esc)}<section class="checklist"><span class="eyebrow">TRY IT TODAY</span><h2>읽었다면, 하나씩 체크</h2><p>체크는 이 기기에만 저장됩니다.</p>${p.checklist.map((c,i)=>`<label><input type="checkbox" data-check="${p.slug}-${i}"><span>${esc(c)}</span></label>`).join('')}</section><section class="sources"><h2>출처와 확인 기준</h2><p>공식 안내를 바탕으로 한끗생활이 한국어로 재구성한 가이드입니다. 정리 순서 등 편집부 제안은 본문에 구분했습니다. 화면과 기능은 기기·버전에 따라 다를 수 있습니다.</p><ul>${p.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><span>내용 확인 ${esc(s.checked)}</span></li>`).join('')}</ul><a class="text-link" data-open-report href="#report-guide">내용이 달라졌나요? 정정 요청 →</a></section><div class="share-row"><strong>함께 알아두면 좋으니까</strong><button type="button" data-share>공유하기 ↗</button><button type="button" data-copy>링크 복사</button><button type="button" data-save="${p.slug}" aria-pressed="false">글 저장</button></div>${relatedGuides(p)}${commentsHtml(p)}</article></main>`;
await mkdir(resolve(dist,'articles',p.slug),{recursive:true});await writeFile(resolve(dist,'articles',p.slug,'index.html'),shell({title:p.title,description:p.summary,path,body,post:p}));
}
const snsPath='/sns/';
const snsPicks=[
  'gmail-block-vs-unsubscribe', 'google-docs-version-copy-before-restore',
  'chrome-extension-hide-vs-disable', 'chrome-incognito-limits',
  'gmail-archive-find-again', 'google-device-sessions-review',
];
const snsGuideList=[
  ...snsPicks.map(slug=>posts.find(post=>post.slug===slug)).filter(Boolean),
  ...posts.filter(post=>!snsPicks.includes(post.slug)),
];
const snsTitle='SNS에서 본 글';
const snsDescription='인스타그램과 페이스북에서 본 한끗생활 가이드를 바로 열어보세요.';
const snsGuideLink=(post)=>`<li id="${esc(post.slug)}" data-card data-search="${searchIndex(post)}"><strong>${esc(post.category)}</strong><a href="/articles/${esc(post.slug)}/">${esc(post.title)} →</a>${post.searchAliases?.length?`<span class="sns-alias">SNS 이전 제목: ${esc(post.searchAliases[0])}</span>`:''}</li>`;
const snsBody=`<main id="main" class="wrap topic-page"><div class="breadcrumb"><a href="/">홈</a><span>/</span><span>${snsTitle}</span></div><h1>${snsTitle}</h1><p class="dek">${snsDescription}</p><section class="topic-route" aria-labelledby="sns-guides"><h2 id="sns-guides">가이드 바로 열기</h2><label class="search sns-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="예: 지메일 차단" aria-label="SNS 가이드 검색" maxlength="100"></label><p class="post-count" role="status">${snsGuideList.length}개의 가이드</p><ol>${snsGuideList.map(snsGuideLink).join('')}</ol><p class="empty" hidden>검색 결과가 없습니다. 서비스 이름이나 짧은 단어로 다시 찾아보세요.</p></section><a class="text-link" href="/#latest">최신 글 모아보기 →</a></main>`;
await mkdir(resolve(dist,'sns'),{recursive:true});
await writeFile(resolve(dist,'sns','index.html'),shell({title:snsTitle,description:snsDescription,path:snsPath,body:snsBody}));

for(const [cat,info] of Object.entries(topicInfo)){
  const path='/topics/'+topicPaths[cat]+'/';
  const list=posts.filter(p=>p.category===cat);
  const steps=info.steps.filter(([,slug])=>posts.some(p=>p.slug===slug));
  const body=`<main id="main" class="wrap topic-page"><div class="breadcrumb"><a href="/">홈</a><span>/</span><span>${esc(cat)}</span></div><span class="eyebrow">상황에서 출발하는 가이드</span><h1>${esc(cat)}</h1><p class="dek">${esc(info.intro)}</p><section class="topic-route"><h2>이런 상황이면 여기부터 읽으세요</h2><ol>${steps.map(([question,slug])=>{const p=posts.find(p=>p.slug===slug);return `<li><strong>${esc(question)}</strong><a href="/articles/${p.slug}/">${esc(p.title)} →</a></li>`}).join('')}</ol></section><section><div class="section-head"><h2>${esc(cat)} 전체 가이드</h2><span>${list.length}개</span></div><div class="cards">${list.map(card).join('')}</div></section><aside class="topic-route"><h2>다른 정리가 필요하신가요?</h2><p>${Object.keys(topicPaths).filter(x=>x!==cat).map(x=>`<a class="text-link" href="/topics/${topicPaths[x]}/">${esc(x)} →</a>`).join(' · ')}</p></aside></main>`;
  await mkdir(resolve(dist,'topics',topicPaths[cat]),{recursive:true});
  await writeFile(resolve(dist,'topics',topicPaths[cat],'index.html'),shell({title:cat+' 상황별 가이드',description:info.intro,path,body}));
}
const contact=config.contactEmail?`<a class="primary-link" href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)} ↗</a>`:config.contactUrl?`<a class="primary-link" href="${esc(config.contactUrl)}" target="_blank" rel="noopener noreferrer">문의·정정 요청 게시판 ↗</a><p>GitHub 이슈를 문의 채널로 사용합니다. 글을 작성하려면 GitHub 계정이 필요하며, 작성 내용은 공개됩니다. 비밀번호·인증번호·개인 연락처 등 비공개 정보는 적지 마세요.</p>`:'<p class="notice">현재 비공개 제작 단계로 공개 문의 채널을 준비하고 있습니다.</p>';
const policies={
privacy:{title:'개인정보 처리 안내',label:'운영 정책',html:privacyHtml},
contact:{title:'문의와 정정 요청',label:'연락하기',html:`<p class="dek">더 정확한 생활 가이드를 함께 만듭니다.</p><p>운영: 한끗생활 편집. 공식 자료를 대조해 디지털 정리·계정 보안·안전한 인터넷의 확인 순서를 안내합니다. 글마다 확인 자료와 검토 범위를 표시합니다.</p>${contactForm(posts,esc)}<details class="review-note"><summary>공개 문의 게시판 이용하기</summary>${contact}</details><h2>저작권·정정 문의</h2><p>관련 글을 선택하고 문제가 되는 위치와 사유를 적어 주세요. 이름·연락처·인증정보는 입력하지 마세요. 문의 내용을 바탕으로 확인 후 글을 수정하거나 추가 안내를 반영합니다.</p>`}
};
for(const [slug,p] of Object.entries(policies)){await mkdir(resolve(dist,slug),{recursive:true});await writeFile(resolve(dist,slug,'index.html'),shell({title:p.title,description:p.title,path:'/'+slug+'/',body:`<main id="main" class="wrap policy"><span class="eyebrow">${p.label}</span><h1>${p.title}</h1><div class="article-body">${p.html}</div></main>`}));}
for(const slug of ['about','editorial']){await mkdir(resolve(dist,slug),{recursive:true});await writeFile(resolve(dist,slug,'index.html'),'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>삭제된 페이지 · 한끗생활</title><main><h1>삭제된 페이지입니다.</h1><a href="/">홈으로</a></main></html>');}
await writeFile(resolve(dist,'404.html'),shell({title:'페이지를 찾을 수 없습니다',description:'다른 생활 가이드를 찾아보세요.',body:'<main id="main" class="wrap policy"><span class="eyebrow">404</span><h1>이 페이지는 찾지 못했어요.</h1><p>주소를 확인하거나 최신 가이드를 살펴보세요.</p><a class="primary-link" href="/">홈으로 돌아가기 →</a></main>'}));
if(config.ads.client)await writeFile(resolve(dist,'ads.txt'),`google.com, ${config.ads.client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
await writeFile(resolve(dist,'robots.txt'),config.publicLaunch?`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
const articleDates=new Map(posts.map(post=>['/articles/'+post.slug+'/',[post.date,guideNotes[post.slug]?.updated].filter(Boolean).sort().at(-1)]));
const paths=['/',snsPath,'/privacy/','/contact/',...Object.values(topicPaths).map(x=>'/topics/'+x+'/'),...articleDates.keys()];
await writeFile(resolve(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${base?paths.map(p=>`<url><loc>${esc(base+p)}</loc>${articleDates.has(p)?`<lastmod>${esc(articleDates.get(p))}</lastmod>`:''}</url>`).join(''):''}</urlset>`);
await writeFile(resolve(dist,'feed.xml'),`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>한끗생활</title><link>${esc(base||'/')}</link><description>알아두면 달라지는 하루</description><language>ko</language>${base?posts.map(p=>`<item><title>${esc(p.title)}</title><link>${esc(base+'/articles/'+p.slug+'/')}</link><guid>${esc(base+'/articles/'+p.slug+'/')}</guid><description>${esc(p.summary)}</description><pubDate>${new Date(p.publishedAt||p.date+'T09:00:00+09:00').toUTCString()}</pubDate></item>`).join(''):''}</channel></rss>`);
await writeFile(resolve(dist,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  X-Frame-Options: SAMEORIGIN\n${!config.publicLaunch?'  X-Robots-Tag: noindex, nofollow\n':''}`);
console.log(`Build complete: ${posts.length} articles, ${paths.length+1} HTML pages. Mode: ${config.publicLaunch?'public':'preview / noindex'}. Paid API calls: 0.`);
