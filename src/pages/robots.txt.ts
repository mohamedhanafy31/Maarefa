import type { APIRoute } from 'astro';
import { SITE_URL, isPreviewHost } from '../lib/site';

// Derived from SITE_URL, not hand-maintained. While the site is on pages.dev
// nothing is crawlable; pointing SITE_URL at a real domain opens it up in the
// same change. See docs/ADDENDUM-hosting.md.
export const GET: APIRoute = () => {
  const body = isPreviewHost
    ? `# Preview host — nothing here should be indexed yet.\nUser-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /rtl-test/\n\nSitemap: ${new URL('/sitemap.xml', SITE_URL).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
