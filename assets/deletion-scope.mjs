export const deletionCases = {
  usage: {label:'무엇이 공간을 차지하는지 아직 모름', article:'phone-storage-before-delete', text:'저장공간에서 사용량이 큰 항목부터 읽으세요. 전체 사용량을 확인하기 전에는 사진·앱 데이터를 삭제 대상으로 정하지 않습니다.'},
  photos: {label:'Google 포토의 기기 여유 공간 확보', article:'google-photos-free-up-space-device-copy', text:'백업된 기기 사본을 정리하는 기능입니다. 포토에 사진이 보인다는 사실만으로 백업 완료를 판단하지 말고, 개별 항목의 백업 상태와 정확한 작업 이름을 확인하세요.'},
  trash: {label:'Google 포토에서 휴지통으로 이동', article:'google-photos-free-up-space-device-copy', text:'기기 공간 확보와 다릅니다. 포토 보관함에도 영향을 주는 삭제이므로 기기 사본만 정리하려는 목적이라면 여기서 멈추세요.'},
  gallery: {label:'삼성 갤러리에서 사진 삭제', article:'google-photos-free-up-space-device-copy', text:'연동 조건에 따라 다른 보관 위치에도 삭제가 반영될 수 있습니다. 현재 기기와 앱의 연동 범위를 모르면 삭제하지 말고 안내를 확인하세요.'},
  history: {label:'PC Chrome 다운로드 목록에서 삭제', article:'chrome-download-history-vs-files', text:'목록 정리와 실제 파일 삭제를 구분하세요. 디스크 공간이 목적이라면 파일의 저장 위치와 보관 필요성을 먼저 확인해야 합니다.'},
  appdata: {label:'갤럭시 앱의 데이터 삭제', article:'phone-storage-before-delete', text:'캐시 정리와 다릅니다. 앱 파일·설정·계정 등의 데이터에 영향을 줄 수 있으므로 다운로드 정리와 혼동하지 말고 앱의 안내를 확인하세요.'}
};
export function deletionAdvice(key,backup='unknown') {
  const item=deletionCases[key];
  if(!item)return {text:'화면에 보이는 작업을 골라 주세요. 모르는 작업은 실행하지 마세요.',article:null};
  const note=key==='photos' ? (backup==='checked' ? ' 백업 상태를 확인했더라도 이 도우미가 실제 파일·계정·연동을 검사한 것은 아닙니다. 정리 가능 여부를 보증하지 않습니다.' : ' 백업 상태를 확인하지 못했다면 정리를 진행하지 마세요.') : '';
  return {text:item.text+note,article:item.article};
}
const form=globalThis.document?.querySelector('[data-deletion-scope]');
if(form){
  const result=form.querySelector('[data-scope-result]'),link=form.querySelector('[data-scope-link]');
  const update=()=>{const key=form.elements.operation.value;const advice=deletionAdvice(key,form.elements.backup.value);form.querySelector('[data-backup-question]').hidden=key!=='photos';result.textContent=advice.text;link.hidden=!advice.article;if(advice.article)link.href='/articles/'+advice.article+'/';};
  form.addEventListener('change',update);form.addEventListener('submit',event=>event.preventDefault());update();
}
