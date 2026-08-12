# Addendum — hosting before the domain exists

Supersedes the P1 acceptance criterion "live on the real domain" and clarifies Q-2.

## The decision

No domain is being purchased yet. **Deploy to Cloudflare Pages' free subdomain — `maarefa.pages.dev`.**

**Vercel and Replit are both out**, for different reasons.

Vercel is already banned in `CLAUDE.md` — the Hobby plan prohibits commercial use, names ad-supported sites explicitly, and hard-pauses at quota rather than billing overage. That ban does not relax for a temporary deploy.

The larger reason applies to both: attaching a real domain to an existing Cloudflare Pages project later is **not a migration** — it is a setting. Same project, same build, same infrastructure; the custom domain simply becomes canonical. Moving from `*.vercel.app` or a Replit deployment to Cloudflare Pages later *is* a real migration, across providers, with redirect chains and re-verification.

Cloudflare Pages gives the same free subdomain and instant deploy with none of that. There is no advantage to the alternatives, only cost deferred to a worse moment.

## Indexing policy until the domain is attached

**`noindex` everything on `pages.dev`.** Set it at the header level via `_headers` so it cannot be forgotten per-page, and keep `robots.txt` disallowing crawl until the flip.

This prevents the mess the alternative creates: if `pages.dev` gets indexed and the real domain arrives later, you inherit duplicate content, split signals, and a redirect chain across the exact URLs the site's value depends on. Nothing worth indexing exists yet, so there is no cost to waiting.

**One constant controls the flip.** `SITE_URL` already exists per the plan; make the `noindex` header and the sitemap/canonical behaviour derive from whether it points at a `pages.dev` host or a real domain. Attaching the domain should then be: change one value, redeploy, verify in Search Console. No code archaeology.

## Revised gates

| Prompt | Was | Now |
|---|---|---|
| **P1** | Live on the real domain | **Live on `maarefa.pages.dev`, `noindex`, correct at 380px** |
| **P6** | — | **Real domain attached, `noindex` lifted, Search Console verified against the real domain** |

Everything between P1 and P5 is unaffected. The domain is needed by **P6**, not before.

## What this trades away

The earlier argument for registering immediately was to start accumulating age and indexing. Deferring gives that up until the domain is attached — a real but small cost, since indexing signals accumulate against published content, and there is none yet.

The residual risk worth naming: **"معرفة" is a common word and the matching domain may be taken by the time it is wanted.** Checking availability costs nothing and can happen at any point; registering can wait. Discovering at P6 that the name is unavailable would be considerably more expensive than a $10 registration now.
