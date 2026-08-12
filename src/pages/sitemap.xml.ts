/**
 * /sitemap.xml — hand-rolled rather than @astrojs/sitemap.
 *
 * The integration would happily list every built route, and this site builds
 * routes that must never be listed: draft lessons (published:false build real
 * noindex pages so they can be reviewed from a phone) and /admin/. Filtering
 * those out is the entire job, so the integration would be a dependency that
 * still needed the same allowlist written by hand.
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_URL } from '../lib/site.ts';

type Entry = { path: string; lastmod?: string; priority: string };

export const GET: APIRoute = async () => {
  const [lessons, problems] = await Promise.all([
    getCollection('lessons'),
    getCollection('problems'),
  ]);

  const entries: Entry[] = [
    { path: '/', priority: '1.0' },
    { path: '/rust/', priority: '0.9' },
    { path: '/problems/', priority: '0.8' },
    { path: '/about/', priority: '0.5' },
    { path: '/discuss/', priority: '0.4' },
  ];

  for (const l of lessons) {
    if (!l.data.published) continue; // drafts are noindex; never advertise them
    entries.push({
      path: `/rust/${l.data.module}/${l.data.slug}/`,
      lastmod: l.data.updated,
      priority: '0.8',
    });
  }

  for (const p of problems) {
    if (!p.data.published) continue;
    entries.push({
      path: `/problems/${p.data.slug}/`,
      lastmod: p.data.updated,
      priority: '0.7',
    });
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries
      .map((e) => {
        const loc = new URL(e.path, SITE_URL).href;
        return (
          '  <url>\n' +
          `    <loc>${loc}</loc>\n` +
          (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : '') +
          `    <priority>${e.priority}</priority>\n` +
          '  </url>'
        );
      })
      .join('\n') +
    '\n</urlset>\n';

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
