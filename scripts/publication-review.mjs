import {createHash} from 'node:crypto';

export function articleDigest(post) {
  const {slug,title,summary,takeaway,sections,checklist,sources}=post;
  return createHash('sha256').update(JSON.stringify({slug,title,summary,takeaway,sections,checklist,sources})).digest('hex');
}

export function validatePublicationReview(post, reviews) {
  const r=reviews[post.slug];
  if(!r || r.digest!==articleDigest(post))throw Error('발행 전 내용 검토가 없거나 본문이 변경됐습니다: '+post.slug);
  for(const key of ['readerTask','distinctValue','practicalCheck','limitations']) {
    if(typeof r[key]!=='string'||r[key].trim().length<20)throw Error('구체적인 검토 내용 필요: '+post.slug+' / '+key);
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.reviewedAt)||r.reviewedAt>new Date().toISOString().slice(0,10))throw Error('검토일 오류: '+post.slug);
  if(!['official-documents','service-ui','local-tool'].includes(r.evidenceType))throw Error('확인 범위 필요: '+post.slug);
  if(!Array.isArray(r.sourceUrls)||!post.sources.every(s=>r.sourceUrls.includes(s.url)))throw Error('출처별 검토 기록 필요: '+post.slug);
  if(!Array.isArray(r.comparedWith)||r.comparedWith.length===0||r.comparedWith.includes(post.slug))throw Error('기존 글과 차이 검토 필요: '+post.slug);
  return true;
}
