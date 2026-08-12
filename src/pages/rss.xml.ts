/**
 * /rss.xml — lessons and problem pages, newest first.
 *
 * Uses @astrojs/rss, which is already a dependency. Drafts are excluded for the
 * same reason they are excluded from the sitemap: a feed item is a publication
 * announcement, and a draft has not been published.
 *
 * pubDate falls back to the build date when `updated` is absent. That is not
 * ideal — it makes an undated entry look new on every deploy — so `updated` is
 * set on every published entry, and this fallback exists only so a missing
 * field cannot break the feed.
 */

import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE, SITE_URL } from '../lib/site.ts';

export const GET: APIRoute = async (context) => {
  const [lessons, problems] = await Promise.all([
    getCollection('lessons'),
    getCollection('problems'),
  ]);

  const items = [
    ...lessons
      .filter((l) => l.data.published)
      .map((l) => ({
        title: l.data.title,
        description: l.data.description,
        link: `/rust/${l.data.module}/${l.data.slug}/`,
        pubDate: l.data.updated ? new Date(l.data.updated) : new Date(),
        categories: ['درس', l.data.module],
      })),
    ...problems
      .filter((p) => p.data.published)
      .map((p) => ({
        title: p.data.title,
        description: p.data.description,
        link: `/problems/${p.data.slug}/`,
        pubDate: p.data.updated ? new Date(p.data.updated) : new Date(),
        categories: ['مشكلة'],
      })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site ?? SITE_URL,
    items,
    customData: '<language>ar</language>',
  });
};
