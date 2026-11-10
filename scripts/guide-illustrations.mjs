const examples = {
  'phone-storage-before-delete': [0, '휴대전화 저장 공간', '설정에서 많이 차지하는 항목 확인', '사진을 지우기 전 백업 상태 확인'],
  'different-passwords': [0, '계정마다 다른 비밀번호', '이메일부터 고유한 비밀번호 사용', '바꾼 뒤 복구 정보 확인'],
  'google-two-step': [1, 'Google 2단계 인증', 'Google 계정 → 보안 및 로그인', '2단계 인증과 복구 수단 확인'],
  'firefox-cache-only': [1, 'Firefox에서 지울 항목', '캐시: 웹페이지 임시 파일', '로그인 유지가 필요하면 쿠키 선택 확인'],
  'android-notification-cleanup': [1, 'Android 알림 조정', '알림을 보낸 앱 먼저 확인', '설정에서 그 앱의 알림만 조정'],
  'google-connected-apps-review': [1, 'Google 연결 앱 점검', '연결 종류와 부여한 권한 확인', '앱 데이터 삭제는 해당 앱에서 별도 확인'],
  'chrome-site-notifications-check': [1, 'PC Chrome 알림', '설정 → 개인 정보 보호 및 보안', '사이트 설정 → 알림에서 주소 확인'],
  'chrome-download-history-vs-files': [1, '다운로드 목록과 파일', 'Chrome 목록에서 지워도 실제 파일은 남아요', '실제 파일은 저장 폴더에서 확인'],
  'google-device-sessions-review': [0, 'Google 로그인 기기', '보안 및 로그인 → 내 기기', '같은 기기 이름이면 세션별 세부정보 확인'],
  'chrome-incognito-limits': [1, '시크릿 창을 닫은 뒤', '다운로드한 파일은 기기에 남아요', '추가한 북마크도 남아요'],
  'gmail-archive-find-again': [1, '보관한 Gmail 찾기', '전체보관함 또는 검색에서 메일 찾기', '필요하면 받은편지함으로 이동'],
  'chrome-extension-hide-vs-disable': [1, 'Chrome 확장 프로그램', '툴바에서 숨기기: 아이콘 표시를 바꿔요', '확장 프로그램 관리: 사용 상태 확인'],
  'google-drive-restricted-vs-folder-access': [1, 'Google Drive 공유', '일반 액세스에서 링크 범위 확인', '공유 대상과 상위 폴더 권한도 확인'],
  'android-update-three-status-lines': [0, 'Android 업데이트', 'Android 버전', 'Android 보안 업데이트', 'Google Play 시스템 업데이트'],
  'firefox-bookmarks-html-vs-restore': [1, 'Firefox 북마크 옮기기', '다른 브라우저로 옮길 때: HTML 내보내기', 'Firefox에서 되돌릴 때: 백업 복원'],
  'gmail-find-pdf-with-filename': [0, 'Gmail PDF 첨부 검색', '검색창에 filename:pdf 입력', '결과가 많으면 발신자나 날짜 추가'],
  'edge-tracking-prevention-levels': [1, 'Edge 추적 방지', '현재 단계 확인: 기본·균형·엄격', '문제가 한 사이트에서만 생기는지 확인'],
  'onedrive-cloud-vs-green-check-offline': [1, 'OneDrive 파일 아이콘', '파란 구름: 온라인 전용', '흰 원의 녹색 체크: 기기에서 사용 가능', '녹색 원의 흰 체크: 이 기기에 항상 보관'],
  'windows-show-file-name-extensions': [1, 'Windows 파일 확장명', '예시: 보고서.pdf.exe', '맨 끝 확장명은 .exe'],
  'google-backup-codes-replace-old-set': [1, 'Google 백업 코드', '코드 하나 사용: 그 코드만 사용 완료', '새 세트 발급: 이전 세트 사용 불가'],
  'google-photos-free-up-space-device-copy': [1, 'Google 포토 공간 정리', '기기 공간 확보: 백업된 기기 사본 정리', '휴지통 이동: 포토 보관함 항목 정리'],
  'firefox-https-only-secure-site-warning': [1, 'Firefox 연결 경고', '경고 화면에 나온 주소를 다시 확인', '확인되기 전에는 로그인 정보 입력 보류'],
  'gmail-undo-send-window-settings': [1, 'Gmail 보내기 취소', '발송 직후 화면 왼쪽 아래에서 실행취소', '미리 모든 설정에서 취소 시간 선택'],
  'windows-storage-sense-downloads-setting': [1, 'Windows 저장소 센스', '휴지통과 다운로드 조건을 각각 확인', '보관할 다운로드 파일의 위치 확인'],
  'android-play-protect-warning-check': [1, 'Google Play Protect', '경고에 나온 앱 이름과 설치 출처 확인', '앱 검사 경고와 기기 인증 안내를 구분'],
};

const graphemes = new Intl.Segmenter('ko', { granularity: 'grapheme' });
const oneDriveIcons = [
  '<path d="M-11 6h21a5 5 0 0 0 0-10h-2a7 7 0 0 0-13-2 5 5 0 0 0-6 4 4 4 0 0 0 0 8Z" fill="none" stroke="#1964b0" stroke-width="2"/>',
  '<circle r="13" fill="#fff" stroke="#22704a" stroke-width="2"/><path d="m-6 0 4 4 8-8" fill="none" stroke="#22704a" stroke-width="2.5"/>',
  '<circle r="13" fill="#22704a"/><path d="m-6 0 4 4 8-8" fill="none" stroke="#fff" stroke-width="2.5"/>',
];

function wrap(text, limit) {
  const lines = [];
  let line = '';
  let width = 0;
  const cells = character => {
    if (/^[ ilI.:;,!|'`]$/.test(character)) return 0.36;
    if (/^[MW@%]$/.test(character)) return 1;
    if (/^[\x21-\x7e]$/.test(character)) return 0.74;
    return 1.1;
  };
  for (const word of text.trim().split(/\s+/u)) {
    const letters = [...graphemes.segment(word)].map(part => part.segment);
    const wordWidth = letters.reduce((sum, letter) => sum + cells(letter), 0);
    if (line && width + cells(' ') + wordWidth > limit) {
      lines.push(line);
      line = '';
      width = 0;
    }
    if (line) {
      line += ' ';
      width += cells(' ');
    }
    for (const letter of letters) {
      const size = cells(letter);
      if (line && width + size > limit) {
        lines.push(line);
        line = '';
        width = 0;
      }
      line += letter;
      width += size;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function buildGuideIllustration(post, esc) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) throw Error('안전하지 않은 그림 주소');
  const [section, title, ...points] = Object.hasOwn(examples, post.slug)
    ? examples[post.slug]
    : [0, '이 글의 확인 항목', ...post.checklist.slice(0, 2)];
  const width = 360;
  const titleLines = wrap(title, 12.5);
  const text = (line, x, y, size, bold = false) => `<text x="${x}" y="${y}" font-size="${size}"${bold ? ' font-weight="700"' : ''}>${esc(line)}</text>`;
  let top = 52 + (titleLines.length - 1) * 30;
  const rows = points.map((point, index) => {
    const lines = wrap(point, 11);
    const rowHeight = 28 + lines.length * 28;
    const marker = post.slug === 'onedrive-cloud-vs-green-check-offline'
      ? `<g transform="translate(42 ${top + 27})">${oneDriveIcons[index]}</g>`
      : `<circle cx="42" cy="${top + 27}" r="15" fill="#124c42"/><text x="42" y="${top + 34}" fill="#fff" font-size="20" font-weight="700" text-anchor="middle">${index + 1}</text>`;
    const body = `<rect x="17" y="${top}" width="326" height="${rowHeight}" rx="10" fill="${index === 0 ? '#d9eea5' : '#fff'}" stroke="#a6bba9"/>`
      + marker + lines.map((line, i) => text(line, 65, top + 35 + i * 28, 22)).join('');
    top += rowHeight + 10;
    return body;
  }).join('');
  const height = top + 7;
  const alt = `${title}. ${points.join(' · ')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    + `<title>${esc(title)}</title><desc>${esc(alt)}</desc><rect width="${width}" height="${height}" fill="#edf2e4"/>`
    + '<g font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" fill="#143f36">'
    + titleLines.map((line, i) => text(line, 20, 34 + i * 30, 24, true)).join('')
    + rows + '</g></svg>\n';
  return { section, file: `guide-illustration-${post.slug}.svg`, width, height, alt, caption: `${title} 한눈에 보기`, svg };
}
