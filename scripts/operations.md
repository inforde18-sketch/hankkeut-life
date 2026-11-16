# 글 발행과 댓글·문의 운영

## 새 글 발행 전

공식 출처와 기존 글을 직접 읽고, 구체적인 독자 과제·다른 글과의 차이·확인 순서·확인하지 못한 범위를 `content/publication-reviews.json`에 기록합니다. `articleDigest`는 본문·출처·체크리스트를 묶은 SHA-256입니다. 내용이 바뀌면 이전 검토로 발행할 수 없습니다. 글자 수나 하루 발행 일정만으로 검토를 통과시키지 않습니다. 자료를 읽은 것과 실제 기기에서 시험한 것을 구별합니다. 실제 시험하지 않은 기능은 official-documents로 표시합니다.

`node scripts/build.mjs`, `node scripts/check.mjs`, `node scripts/publish-due.mjs --dry-run`을 실행합니다. 누락된 검토는 자동 발행을 중단시킵니다. 기존 공개 글이나 SNS 예약은 지우지 않습니다.

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
