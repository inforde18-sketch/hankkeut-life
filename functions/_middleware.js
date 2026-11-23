import meta from '../runtime/publication-meta.generated.mjs';
import pages from '../runtime/publication-pages.generated.mjs';
import {servePublication} from '../lib/publication-runtime.mjs';

export function onRequest(context) {
  // Only server time is trusted. Query strings/headers cannot reveal a future article.
  return servePublication(context, meta, pages);
}
