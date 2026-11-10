import articles from '../../content/articles.json';

const published = new Map(articles.filter((post) => post.status === 'published').map((post) => [post.slug, post.date]));
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const nicknamePattern = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} _-]*$/u;
const invisibleControls = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;
const links = /(?:https?\s*:\s*\/\/|www\s*\.|\b(?:[a-z0-9-]+\.)+(?:com|net|org|dev|kr|io|me|link|xyz)\b|\b(?:t\.me|bit\.ly|goo\.gl)\b)/iu;
const personalInfo = /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:^|[^\d])(?:\+?82[\s.()-]*)?0?1[016789][\s.()-]*\d{3,4}[\s.()-]*\d{4}(?!\d)|(?:^|[^\d])0(?:2|[3-6][1-5]|70)[\s.()-]+\d{3,4}[\s.()-]+\d{4}(?!\d)|(?:^|[^\d])\d{6}[\s-]*[1-8]\d{6}(?!\d))/iu;
const compact = (value) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const restricted = ['씨발', '씨팔', '씹새', '개새끼', '좆같', '병신', '지랄', '성노예', '야동', 'ㅅㅂ', 'ㅂㅅ', 'ㅈㄹ', 'fuck', 'bitch', 'porn', 'nigger'].map(compact);
const nicknameOnly = /보지|자지|자위|섹스|성인방/u;
const reserved = /^(?:한끗생활|관리자|운영자|편집부|공식계정|admin|moderator|support|staff|hankkeut)/u;
function blockedText(value) {
  const normalized = compact(value);
  return restricted.some((term) => normalized.includes(term)) || /시발(?!점)/u.test(normalized);
}
const tenMinutes = 10 * 60;
const maxBytes = 4096;
const reportReasons = new Set(['내용 오류', '댓글 문제', '개인정보 노출', '기타']);

function respond(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

async function readSubmission(request) {
  if (Number(request.headers.get('content-length')) > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let input = '';
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(input + decoder.decode());
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        return null;
      }
      input += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function submitReport(db, article, data) {
  const { id, reason, commentId, note, website } = data || {};
  if (typeof id !== 'string' || !uuidPattern.test(id) || !reportReasons.has(reason) ||
      typeof commentId !== 'string' || typeof note !== 'string' || website !== '' ||
      (commentId && !uuidPattern.test(commentId)) || (reason === '댓글 문제' && !commentId)) {
    return respond({ message: '신고 항목과 대상을 확인해 주세요.' }, 400);
  }
  const text = note.replace(/\r\n?/g, '\n').normalize('NFC').trim();
  if (text.length > 300 || invisibleControls.test(text) || personalInfo.test(text.normalize('NFKC'))) {
    return respond({ message: '연락처나 개인정보를 빼고 300자 이내로 입력해 주세요.' }, 400);
  }
  const now = Math.floor(Date.now() / 1000);
  const target = commentId.toLowerCase();
  const key = id.toLowerCase();
  const { meta } = await db.prepare(`
    INSERT INTO reports (id, article, comment_id, reason, note, created_at)
    SELECT ?, ?, ?, ?, ?, ?
    WHERE (? = '' OR EXISTS (SELECT 1 FROM comments WHERE id = ? AND article = ? AND hidden = 0))
      AND (SELECT COUNT(*) FROM reports WHERE created_at >= ?) < 40
      AND (SELECT COUNT(*) FROM reports WHERE article = ? AND created_at >= ?) < 8
    ON CONFLICT(id) DO NOTHING
  `).bind(key, article, target, reason, text, now, target, target, article, now - tenMinutes, article, now - tenMinutes).run();
  if (meta.changes) return respond({ message: '신고를 비공개로 접수했습니다.' }, 201);
  const existing = await db.prepare('SELECT article, comment_id, reason, note FROM reports WHERE id = ?').bind(key).first();
  if (existing && existing.article === article && existing.comment_id === target && existing.reason === reason && existing.note === text) {
    return respond({ message: '신고를 비공개로 접수했습니다.' });
  }
  return respond({ message: '대상을 확인하거나 잠시 뒤 다시 시도해 주세요.' }, 429);
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const article = url.searchParams.get('article') || '';
  const date = published.get(article);
  if (!slugPattern.test(article) || !date || Date.parse(date + 'T00:00:00+09:00') > Date.now()) {
    return respond({ message: '공개된 글의 댓글만 이용할 수 있습니다.' }, 404);
  }
  if (!['GET', 'POST'].includes(request.method)) {
    return respond({ message: '지원하지 않는 요청입니다.' }, 405, { Allow: 'GET, POST' });
  }

  const db = env.COMMENTS_DB;
  if (!db) return respond({ message: '댓글을 잠시 이용할 수 없습니다.' }, 503);
  const isReport = url.searchParams.get('report') === '1';
  if (isReport && request.method !== 'POST') return respond({ message: '신고 양식을 사용해 주세요.' }, 405, { Allow: 'POST' });
  try {
    if (request.method === 'GET') {
      const { results } = await db.prepare(
        'SELECT id, nickname, body, created_at FROM comments WHERE article = ? AND hidden = 0 ORDER BY created_at DESC, id DESC LIMIT 50',
      ).bind(article).all();
      return respond({ comments: results });
    }

    if (request.headers.get('origin') !== url.origin ||
        request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return respond({ message: '글 페이지에서 댓글을 작성해 주세요.' }, 403);
    }

    const data = await readSubmission(request);
    if (isReport) return await submitReport(db, article, data);
    if (!data || typeof data.nickname !== 'string' || typeof data.body !== 'string' ||
        typeof data.id !== 'string' || !uuidPattern.test(data.id) || data.website !== '') {
      return respond({ message: '댓글 양식을 확인해 주세요.' }, 400);
    }

    const id = data.id.toLowerCase();
    const nickname = data.nickname.normalize('NFKC').trim();
    const body = data.body.replace(/\r\n?/g, '\n').normalize('NFC').trim();
    if (nickname.length < 2 || nickname.length > 20 || !nicknamePattern.test(nickname)) {
      return respond({ message: '닉네임은 문자나 숫자로 시작하는 2~20자로 입력해 주세요.' }, 400);
    }
    const normalizedNickname = compact(nickname);
    if (reserved.test(normalizedNickname) || nicknameOnly.test(normalizedNickname) ||
        blockedText(nickname) || personalInfo.test(nickname)) {
      return respond({ message: '다른 닉네임을 사용해 주세요.' }, 400);
    }
    if (!body || body.length > 500 || invisibleControls.test(body)) {
      return respond({ message: '댓글은 1~500자의 일반 텍스트로 입력해 주세요.' }, 400);
    }
    const safetyText = body.normalize('NFKC');
    if (links.test(safetyText) || personalInfo.test(safetyText) || blockedText(safetyText)) {
      return respond({ message: '외부 링크, 연락처, 개인정보 또는 부적절한 표현을 빼고 다시 작성해 주세요.' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - tenMinutes;
    // Check quotas and insert together so concurrent submissions cannot bypass the limits.
    const { meta } = await db.prepare(`
      INSERT INTO comments (id, article, nickname, body, created_at)
      SELECT ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM comments WHERE id = ?)
        AND (SELECT COUNT(*) FROM comments WHERE created_at >= ?) < 60
        AND (SELECT COUNT(*) FROM comments WHERE article = ? AND created_at >= ?) < 12
        AND NOT EXISTS (
          SELECT 1 FROM comments WHERE article = ? AND nickname = ? COLLATE NOCASE AND body = ? AND created_at >= ?
        )
    `).bind(id, article, nickname, body, now, id, cutoff, article, cutoff, article, nickname, body, cutoff).run();
    if (meta.changes) return respond({ message: '댓글을 등록했습니다.' }, 201);

    const existing = await db.prepare('SELECT article, nickname, body, hidden FROM comments WHERE id = ?').bind(id).first();
    if (existing && !existing.hidden && existing.article === article && existing.nickname === nickname && existing.body === body) {
      return respond({ message: '댓글을 등록했습니다.' });
    }
    return respond({ message: '같은 댓글을 이미 등록했거나 등록이 잠시 제한됐습니다. 잠시 후 다시 시도해 주세요.' }, 429);
  } catch {
    if (isReport) return respond({ message: '신고를 잠시 접수할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, 503);
    return respond({ message: '댓글을 잠시 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, 503);
  }
}
