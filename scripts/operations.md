# 글 발행과 댓글·문의 운영

## 새 글 발행 전

공식 출처와 기존 글을 직접 읽고, 구체적인 독자 과제·다른 글과의 차이·확인 순서·확인하지 못한 범위를 `content/publication-reviews.json`에 기록합니다. `articleDigest`는 본문·출처·체크리스트를 묶은 SHA-256입니다. 내용이 바뀌면 이전 검토로 발행할 수 없습니다. 글자 수나 하루 발행 일정만으로 검토를 통과시키지 않습니다. 자료를 읽은 것과 실제 기기에서 시험한 것을 구별합니다. 실제 시험하지 않은 기능은 official-documents로 표시합니다.

`node scripts/build.mjs`, `node scripts/check.mjs`, `node scripts/test-publication-clock.mjs`, `node scripts/publish-due.mjs --dry-run`을 실행합니다. 누락된 검토는 자동 발행을 중단시킵니다. 기존 공개 글이나 SNS 예약은 지우지 않습니다.

## 매일 오전 08:17 공개 (한국 시간)

검토된 예약 글을 배포할 때 본문·홈·SNS 목록·주제 목록·문의 선택지·RSS·사이트맵을 미리 만듭니다. 미래 본문은 공개 정적 폴더가 아닌 서버 함수 묶음에만 저장합니다. Cloudflare 서버 시각이 `site.config.json`의 `publicationTimeKst`(08:17)에 도달하면 새 요청부터 해당 글과 목록을 함께 응답합니다. 글의 기존 `publishAt`이 더 늦으면 그 시각을 지킵니다. 자바스크립트를 끈 방문자·검색 로봇도 같은 서버 응답을 받으며 클라이언트 시계나 URL 매개변수로 공개를 앞당길 수 없습니다. HTML·피드·상태 응답은 no-store로 캐시의 이전 목록이 남는 것을 막습니다.

GitHub Actions의 08:17 및 보조 13:43 실행은 공개를 시작하는 작업이 아니라 원격 발행 기록을 정리하는 작업입니다. 실행이 늦어져도 이미 준비한 글의 공개 시각은 바뀌지 않습니다. 기록 동기화는 날짜별 한 편 제한과 검토 digest를 확인하고, 지연된 날짜의 기록도 원래 날짜·서버 공개 시각을 보존해 정리합니다. `archivedAt`은 실제 기록 정리 시각입니다. 반복 실행은 중복 발행하지 않습니다.

실제 공개 현황은 `https://hankkeut-life.pages.dev/api/publication-status`의 서버 기준 publicArticleCount/latest/nextRelease/preparedThrough를 확인하고 기사 URL·홈·SNS 목록도 대조합니다. 원격 articles.json은 기록 정리 전까지 한 발 늦을 수 있으므로 실제 공개 수와 동일하다고 단정하지 않습니다. 다음 7일의 검토된 대기열을 계속 보충·배포해야 합니다. 새 예약 본문은 배포가 완료되기 전까지 준비된 것으로 보지 않습니다.

기존 Pages Functions 무료 한도를 사용하며 새 유료 서비스·토큰·계정은 없습니다. 정적 이미지·CSS는 함수 호출에서 제외합니다. 무료 한도 소진·호스팅 장애까지 정시 공개를 보장하는 것은 아니며, 이때 상태 조회 실패를 정상으로 기록하지 않습니다.

## 댓글 신고 확인 → 숨김 → 복원

1. 신고는 비공개 D1 `reports`에 저장됩니다. Cloudflare 대시보드 → Workers & Pages → D1 → 기존 COMMENTS_DB 데이터베이스 → Console에서 아래 SELECT로 확인합니다. 계정 인증은 운영자만 수행합니다. 신고 내용·닉네임을 GitHub 이슈나 소스에 복사하지 않습니다.
2. 댓글 내용과 신고 사유를 검토합니다. 신고 한 건만으로 자동 숨김하지 않습니다. 링크·개인정보·부적절 표현 필터와 등록 제한은 계속 적용합니다.
3. `node scripts/moderate-comment.mjs hide 확인한-댓글-ID`를 실행한 뒤 JSON의 ID만 기존 저장소에 반영합니다. 새 인증정보는 만들지 않습니다. Cloudflare 배포 후 해당 글에서 보이지 않는지 확인합니다.
4. 오판이면 같은 명령의 restore를 사용하고 재배포합니다. D1에서 직접 hidden=1로 처리했다면 Console에서 별도로 복원해야 합니다. 공개 댓글은 기본적으로 즉시 게시하며, 사전 승인제로 바꾸지 않습니다.

```sql
SELECT id,article,comment_id,reason,note,datetime(created_at,'unixepoch','+9 hours') AS received_kst
FROM reports ORDER BY created_at DESC LIMIT 30;
```

문의·신고는 접수 후 90일을 보관 상한으로 합니다. API 요청 때 90일을 넘긴 기록을 정리하므로 요청이 없던 기간에는 정리가 늦을 수 있습니다. 주간 점검 때 아래 문장으로 실제 보관 상태를 정리합니다. 이는 운영 방침이며 Google이 정한 일수는 아닙니다.

```sql
DELETE FROM reports WHERE created_at < unixepoch('now','-90 days');
```

## 광고

현재 광고는 꺼져 있고 광고 로더도 없습니다. 개인정보 안내와 적용 지역의 동의 요건을 실제로 마련한 다음 별도 승인으로 연결합니다. `mayRenderAd`는 공개된 개별 기사 경로에서만 허용하며 문의·개인정보·SNS 링크 목록·오류·삭제 페이지에서는 허용하지 않습니다. 연결 시 Google 인증 CMP가 필요한 지역을 확인하고 버튼·체크리스트·메뉴 주변의 오클릭과 화면 가림을 실제 광고 상태로 시험해야 합니다. 재검토 요청과 광고 활성화는 이 보완 작업에 포함하지 않습니다.
