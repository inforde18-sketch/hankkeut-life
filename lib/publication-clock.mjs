export const kstDay = (time) => new Date(Number(new Date(time)) + 9 * 3600000).toISOString().slice(0, 10);

export function releaseTime(post, config) {
  const clock = config.publicationTimeKst || '08:17';
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock)) throw Error('공개 시각 오류');
  const supplied = Date.parse(post.publishAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || !Number.isFinite(supplied) || kstDay(supplied) !== post.date) {
    throw Error('예약 날짜와 시각 불일치: ' + post.slug);
  }
  return Math.max(supplied, Date.parse(post.date + 'T' + clock + ':00+09:00'));
}

export const isReviewed = (post) => post.status === 'scheduled' &&
  post.reviewed === true && post.sourcesChecked === true && post.rightsChecked === true;
