const queryForm=document.querySelector('[data-query-builder]');
if(queryForm){
 const result=queryForm.querySelector('[data-query-result]');
 const status=queryForm.querySelector('[data-query-status]');
 function update(){
  const e=queryForm.elements;const parts=[`filename:${e.type.value}`];
  const sender=e.sender.value.trim();
  if(sender&&e.sender.validity.valid)parts.push(`from:${sender}`);
  if(e.after.value)parts.push('after:'+e.after.value.replaceAll('-','/'));
  if(e.anywhere.checked)parts.unshift('in:anywhere');
  result.textContent=parts.join(' ');
  status.textContent=sender&&!e.sender.validity.valid?'이메일 주소 형식을 확인하세요.':'';
 }
 queryForm.addEventListener('input',update);queryForm.addEventListener('submit',e=>e.preventDefault());
 queryForm.querySelector('[data-copy-query]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(result.textContent);status.textContent='복사했습니다. Gmail 검색창에 붙여 넣으세요.';}catch{status.textContent='자동 복사가 안 되면 표시된 검색식을 선택해 복사하세요.'}});
 update();
}
const contact=document.querySelector('[data-private-contact]');
if(contact){
 let id;const status=contact.querySelector('[data-contact-status]');
 contact.addEventListener('submit',async e=>{
  e.preventDefault();if(!contact.reportValidity())return;
  const button=contact.querySelector('button[type="submit"]');button.disabled=true;status.textContent='보내는 중입니다…';
  try{
   id??=crypto.randomUUID();
   const response=await fetch('/api/comments?report=1&article='+encodeURIComponent(contact.elements.article.value),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,reason:contact.elements.reason.value,commentId:'',note:contact.elements.note.value,website:contact.elements.website.value})});
   const data=await response.json();status.textContent=data.message||'접수 결과를 확인할 수 없습니다.';
   if(response.ok){contact.reset();id=undefined;}
  }catch{status.textContent='전송을 확인하지 못했습니다. 잠시 뒤 다시 시도하세요.';}
  finally{button.disabled=false;}
 });
 contact.addEventListener('input',()=>{id=undefined;});
}
