import type { APIRoute } from 'astro';
import { SITE_URL, isPreviewHost } from '../lib/site';

/**
 * Derived from SITE_URL, not hand-maintained.
 *
 * Crawling is ALLOWED on the preview host, deliberately. `Disallow: /` would
 * be counterproductive: it stops Google fetching the page, which means it
 * never reads the `X-Robots-Tag: noindex` header that excludes it. A URL
 * discovered by any other route could then still surface as a bare result,
 * precisely because the crawler was blocked from reading the directive.
 *
 * Allow the crawl, let it read noindex, get excluded definitively.
 *
 * `Disallow` is reserved for paths there is no point fetching at all —
 * /admin/ sits behind Cloudflare Access and returns a login redirect. Pages we
 * want kept out of the index but still readable, like /rtl-test/, rely on
 * noindex and stay crawlable so that directive can be seen.
 */
export const GET: APIRoute = () => {
  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /admin/', ''];

  if (isPreviewHost) {
    lines.unshift(
      '# Preview host. Every response carries X-Robots-Tag: noindex, and a',
      '# crawler has to be able to fetch a page to see that. Blocking the',
      '# crawl here would leave URLs indexable-by-discovery instead.',
      ''
    );
  } else {
    // Only advertise a sitemap once there is something worth indexing.
    lines.push(`Sitemap: ${new URL('/sitemap.xml', SITE_URL).href}`, '');
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
