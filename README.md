# 한끗생활

공식 출처와 함께 읽는 한국어 디지털 생활 가이드입니다. 초기 글 5개와 직접 제작한 그래픽을 포함합니다.

## 무료 운영 구조

- Cloudflare Pages Free의 무료 `pages.dev` 주소와 정적 호스팅
- GitHub 공개 저장소의 표준 Ubuntu 실행 환경으로 예약 발행
- 유료 AI API 호출 없음, 도메인 구매 없음
- 광고와 실제 SNS 게시 연결은 별도 계정 준비 후 진행

## 실행

Node.js 22 이상이 필요합니다. 패키지 설치는 필요하지 않습니다.

```sh
node scripts/build.mjs
node scripts/check.mjs
node scripts/test-publishing.mjs
node scripts/serve.mjs
```

## 글과 자동 발행

발행된 글은 `content/articles.json`, 예약 대기 글은 `content/queue.json`에서 관리합니다. 대기 글은 기존 기사와 같은 필드에 아래 값을 추가합니다.

```json
{
  "status": "scheduled",
  "publishAt": "2026-10-23T08:30:00+09:00",
  "reviewed": true,
  "sourcesChecked": true,
  "rightsChecked": true
}
```

실제 검토 후에만 해당 검토 값을 켭니다. 한국 시간 오전 8시 17분에 기한이 된 글을 하루 최대 1개 발행합니다. 실행 지연과 비활성 저장소의 스케줄 중단이 있을 수 있습니다. 공개 저장소에서만 자동화가 실행됩니다. 유료 AI로 새 글을 자동 생성하지 않습니다.

검사에 통과하면 `content/publisher-health.json`에 마지막 점검 시간을 남깁니다. 현재 예약 대기 파일이 비어 있으면 신규 글은 발행하지 않습니다.

## 공개 전 설정

`site.config.json`에 실제 사이트 주소와 문의 채널을 넣고 `publicLaunch`를 켭니다. 문의는 이 저장소의 공개 Issues를 사용할 수 있으며, 민감한 개인정보를 작성하면 안 됩니다. 사이트 제공자를 개인정보 안내에 반영합니다.

Cloudflare 빌드 명령은 `node scripts/build.mjs && node scripts/check.mjs`, 출력 폴더는 `dist`입니다. Git 연동 프로젝트를 사용하면 소스 변경을 배포할 수 있습니다.

## SNS와 광고

`node scripts/social.mjs`는 게시 문구를 내보내기만 합니다. 실제 게시 기능은 기본 꺼짐이며 계정 권한과 지원 API 버전을 연결·검증한 뒤 사용해야 합니다. 초기 글의 JPEG 카드는 `assets/social/`에 있습니다. 새 글에는 별도 카드가 필요합니다.

글에는 본문 제목과 별도로 짧은 `socialHook`, 두 줄의 `thumbnailLines`, 핵심 설명 `thumbnailCaption`, 주제 표시 `thumbnailTag`를 넣습니다. 독자가 확인할 행동이나 궁금증을 앞세우고 본문에서 답을 제공합니다. 카드에는 한눈에 읽히는 두 줄 문구를 크게 표시합니다.

`scripts/social-assets.py`는 기존 브랜드 그래픽을 사용해 Instagram용 1080×1350 카드와 Facebook 공유용 1200×630 썸네일을 생성합니다. 재생성에는 Pillow와 맑은 고딕 글꼴이 필요하며, 미리 만든 이미지를 포함하므로 호스팅 빌드에서는 Python을 실행하지 않습니다. `preview-글주소.jpg`가 해당 글의 공유 미리보기 이미지로 적용됩니다. 예약 글도 발행 전에 이미지를 함께 준비합니다.

AdSense는 가입·소유권 확인·심사 요청을 완료했고 현재 Google 심사 대기 상태입니다. 실제 광고 코드는 활성화하지 않았습니다. 광고 클릭 유도, 봇 트래픽, 허위 수익 약속을 사용하지 않습니다.

## 비용 근거

- [Cloudflare 정적 요청 무료](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare Free 제한](https://developers.cloudflare.com/pages/platform/limits/)
- [GitHub 공개 저장소 표준 실행 환경 무료](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [AdSense 무료 참여와 운영 방식](https://support.google.com/adsense/answer/6242051?hl=ko)

기준일: 2026년 10월 22일. 광고 승인이나 수익, 상시 무료 AI 무인 생성을 보장하지 않습니다.
