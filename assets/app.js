(()=>{
const memory={};const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return memory[k]??f}};
const write=(k,v)=>{memory[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
let saved=read('hankkeut-saved',[]);if(!Array.isArray(saved))saved=[];
const toast=s=>{const el=document.querySelector('.toast');el.textContent=s;el.classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('visible'),2400)};
let category=new URLSearchParams(location.search).get('category')||'전체';
const buttons=[...document.querySelectorAll('[data-filter]')];
if(!buttons.some(b=>b.dataset.filter===category))category='전체';
const searchInput=document.querySelector('input[type=search]');
const searchAliases=[
  [/지\s*메일/g,'gmail'],
  [/(?:구글|google)\s*(?:독스|문서|docs)/g,'docs'],
  [/(?:구글|google)\s*(?:드라이브|drive)/g,'drive'],
  [/크롬/g,'chrome'],
  [/파이어\s*폭스/g,'firefox'],
  [/윈도우(?:즈)?/g,'windows'],
  [/안드로이드/g,'android'],
  [/복구/g,'복원'],
];
function normalizeSearch(text){
  let normalized=text.normalize('NFKC').toLocaleLowerCase('ko');
  for(const [alias,canonical] of searchAliases)normalized=normalized.replace(alias,canonical);
  return normalized.replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
const searchableCards=[...document.querySelectorAll('[data-card]')].map(card=>[card,normalizeSearch(card.dataset.search||'')]);
function filter(){
  const words=normalizeSearch(searchInput?.value||'').split(' ').filter(Boolean);
  let count=0;
  for(const [card,index] of searchableCards){
    const inCategory=category==='전체'||category===card.dataset.category||(category==='저장한 글'&&saved.includes(card.dataset.slug));
    const match=inCategory&&words.every(word=>index.includes(word));
    card.hidden=!match;
    if(match)count++;
  }
  const empty=document.querySelector('.empty');
  if(empty)empty.hidden=count>0;
  const counter=document.querySelector('.post-count');
  if(counter)counter.textContent=`${count}개의 가이드`;
  buttons.forEach(button=>{
    const on=button.dataset.filter===category;
    button.classList.toggle('active',on);
    button.setAttribute('aria-pressed',String(on));
  });
}
buttons.forEach(b=>b.addEventListener('click',()=>{category=b.dataset.filter;const u=new URL(location.href);if(category==='전체')u.searchParams.delete('category');else u.searchParams.set('category',category);history.replaceState(null,'',u);filter()}));document.querySelector('input[type=search]')?.addEventListener('input',filter);
function paint(){document.querySelectorAll('[data-save]').forEach(b=>{const on=saved.includes(b.dataset.save);b.setAttribute('aria-pressed',String(on));b.classList.toggle('is-saved',on);if(b.classList.contains('save'))b.textContent=on?'✓':'♧';else b.textContent=on?'저장됨 ✓':'글 저장'})}
document.querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.save;const on=saved.includes(s);saved=on?saved.filter(x=>x!==s):[...saved,s];write('hankkeut-saved',saved);paint();filter();toast(on?'저장을 해제했습니다':'이 기기에 글을 저장했습니다')}));
document.querySelectorAll('[data-check]').forEach(c=>{c.checked=read('hankkeut-check-'+c.dataset.check,false)===true;c.addEventListener('change',()=>write('hankkeut-check-'+c.dataset.check,c.checked))});
async function copy(){const u=new URL(location.href);u.search='';u.hash='';try{await navigator.clipboard.writeText(u.href);toast('링크를 복사했습니다')}catch{window.prompt('주소를 복사해 주세요.',u.href)}}
document.querySelector('[data-copy]')?.addEventListener('click',copy);document.querySelector('[data-share]')?.addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:document.title,url:location.origin+location.pathname})}catch(e){if(e.name!=='AbortError')copy()}}else copy()});paint();filter();
})();
