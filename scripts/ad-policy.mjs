// No ad loader is installed. These gates must remain closed until a separate launch is authorized.
export function mayRenderAd({config,path,post,consentResolved=false}) {
  return config.ads?.enabled===true && config.ads?.launchApproved===true &&
    config.ads?.privacyReady===true && config.ads?.consentReady===true && consentResolved===true &&
    post?.status==='published' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) &&
    Date.parse(post.date+'T00:00:00+09:00')<=Date.now() && path==='/articles/'+post.slug+'/';
}
export function assertAdsRemainDisabled(config) {
  if(config.ads?.enabled)throw Error('광고 로더 연결은 별도 승인·개인정보·지역별 동의 검증 후에만 가능합니다.');
}
