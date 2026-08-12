/**
 * The one constant that controls the pages.dev → real-domain flip.
 *
 * Per docs/ADDENDUM-hosting.md: until a domain is bought, the site lives on
 * Cloudflare Pages' free subdomain and is noindex everywhere. Attaching a real
 * domain later is a setting on the same Pages project, not a migration.
 *
 * Changing SITE_URL to a non-pages.dev host is the entire flip: canonicals and
 * the sitemap switch to the real host, and `isPreviewHost` goes false, which
 * lifts the noindex header and opens robots.txt. Nothing else needs editing.
 */

export const SITE_URL = 'https://maarefa.pages.dev';

/** True while we are on the free subdomain and must stay out of the index. */
export const isPreviewHost = new URL(SITE_URL).hostname.endsWith('.pages.dev');

export const SITE = {
  name: 'معرفة',
  nameLatin: 'Maarefa',
  tagline: 'اعرف اللي بيحصل تحت الكود',
  taglineEn: 'Learn what happens beneath the code.',
  description:
    'منصة عربية لتعلّم برمجة الأنظمة من الأساس — بصريات للذاكرة، وأسمبلي حقيقي، ومكتبة مشاكل من تصحيح فعلي.',
  lang: 'ar',
  dir: 'rtl',
  /** Capital M — GitHub's casing. Giscus matches the repo string exactly, so
   *  a lowercase copy here would silently fail to resolve a discussion. The
   *  Cloudflare Pages project is separately lowercase, which is what produces
   *  maarefa.pages.dev; the two are not required to match. */
  repo: 'https://github.com/mohamedhanafy31/Maarefa',
  repoSlug: 'mohamedhanafy31/Maarefa',
  /** rustc version every quoted error and assembly panel is stamped with. */
  rustcVersion: '1.97.1',
} as const;

/**
 * Giscus — comments backed by GitHub Discussions on the same repo (C4).
 *
 * `repoId` is verified: GitHub's REST API returns it as `node_id`, and it is
 * the same value giscus wants.
 *
 *   curl -s https://api.github.com/repos/mohamedhanafy31/Maarefa | grep node_id
 *
 * `categoryId` is NOT verifiable that way. Discussion categories only exist in
 * GitHub's GraphQL API, and GraphQL always requires a token — the same
 * limitation that killed the admin Discussions panel (CLAUDE.md, E2). So it is
 * left empty rather than guessed.
 *
 * TO FILL IT IN — one visit, doable from a phone:
 *   1. Install the giscus app on the repo: https://github.com/apps/giscus
 *   2. Open https://giscus.app, enter mohamedhanafy31/Maarefa, pick the
 *      "Announcements" category and the "Discussion title contains a specific
 *      term" mapping.
 *   3. Copy data-category-id from the generated snippet into `categoryId`.
 *
 * Until then, every comment section renders a link straight to the repo's
 * Discussions instead. Nothing breaks, and no third-party script loads.
 */
export const GISCUS = {
  repo: 'mohamedhanafy31/Maarefa',
  repoId: 'R_kgDOT2WV3g',
  category: 'Announcements',
  categoryId: '',
} as const;

export const giscusReady = GISCUS.categoryId.length > 0;
