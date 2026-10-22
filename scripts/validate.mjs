export function validateArticle(p){
if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))throw Error('안전하지 않은 글 주소');
if(!['디지털 정리','계정 보안','안전한 인터넷'].includes(p.category))throw Error('초기 운영 범위 밖의 주제');
for(const k of ['title','summary','takeaway'])if(typeof p[k]!=='string'||!p[k].trim())throw Error('필수 항목 누락: '+k);
if(p.title.length>85)throw Error('제목이 너무 깁니다');
if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date)))throw Error('발행일 필요');
if(!['storage','qr','password','shield','browser'].includes(p.art))throw Error('그래픽 유형 필요');
if(!Number.isInteger(p.minutes)||p.minutes<1||p.minutes>20)throw Error('읽기 시간 오류');
if(!Array.isArray(p.sections)||p.sections.length<3||p.sections.some(s=>!s.heading||!Array.isArray(s.paragraphs)||!s.paragraphs.length||s.paragraphs.some(t=>typeof t!=='string'||!t.trim())))throw Error('본문 3개 절 이상 필요');
if(!Array.isArray(p.checklist)||p.checklist.length<2||p.checklist.some(x=>typeof x!=='string'||!x.trim()))throw Error('체크리스트 필요');
if(p.sections.flatMap(s=>s.paragraphs).join('').length<600)throw Error('본문이 너무 짧습니다');
if(!p.sources?.length)throw Error('출처 필요');
for(const s of p.sources){const u=new URL(s.url);if(u.protocol!=='https:'||!s.title||!/^\d{4}-\d{2}-\d{2}$/.test(s.checked))throw Error('출처 주소와 확인일 필요')}
const text=p.title+' '+p.sections.flatMap(s=>s.paragraphs).join(' ');
if(/100%\s*(보장|치료|수익)|무조건\s*(수익|치료)|광고를?\s*클릭해|조회수\s*조작|전문가들이?\s*숨기/.test(text))throw Error('편집 원칙 위반 표현');
if(p.aiAssisted!==true&&p.aiAssisted!==false)throw Error('AI 작성 지원 여부 필요');
return true;
}
