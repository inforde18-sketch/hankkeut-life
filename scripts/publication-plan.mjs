import {validateArticle} from './validate.mjs';
import {validatePublicationReview} from './publication-review.mjs';
import {releaseTime, isReviewed} from '../lib/publication-clock.mjs';

export function publicationPlan(config, posts, queue, reviews) {
  if (config.dailyPublishLimit !== 1) throw Error('날짜별 공개 한도는 1편이어야 합니다.');
  const slugs = new Set();
  const occupied = new Set(posts.filter(p => p.status === 'published').map(p => p.date));
  for (const post of posts) {
    if (slugs.has(post.slug)) throw Error('중복된 글 주소: ' + post.slug);
    slugs.add(post.slug);
  }
  const plan = [];
  for (const post of queue) {
    if (slugs.has(post.slug)) throw Error('중복된 글 주소: ' + post.slug);
    slugs.add(post.slug);
    if (!isReviewed(post)) continue;
    validateArticle(post);
    validatePublicationReview(post, reviews);
    const at = releaseTime(post, config);
    if (occupied.has(post.date)) throw Error('하루 1편 예약 날짜 중복: ' + post.date);
    occupied.add(post.date);
    plan.push({post, at});
  }
  return plan.sort((a, b) => a.at - b.at);
}
