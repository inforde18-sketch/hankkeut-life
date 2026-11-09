CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY NOT NULL,
  article TEXT NOT NULL,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 2 AND 20),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1))
);

CREATE INDEX IF NOT EXISTS comments_public ON comments (article, hidden, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS comments_recent ON comments (created_at);
CREATE INDEX IF NOT EXISTS comments_article_recent ON comments (article, created_at);

-- 운영자는 Cloudflare D1 Console에서 댓글 ID를 확인한 뒤 특정 댓글을 숨길 수 있습니다.
-- SELECT id, article, nickname, body FROM comments WHERE hidden = 0 ORDER BY created_at DESC LIMIT 20;
-- UPDATE comments SET hidden = 1 WHERE id = '확인한 댓글 ID';
