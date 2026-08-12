/**
 * src/content.config.ts — Maarefa Content Collections
 *
 * Two collections, both using Astro's glob() loader pointed at content/ at the
 * repo root (NOT src/content/ — see PLAN.md §2 and CLAUDE.md repository layout).
 *
 * Schemas use the zod re-exported from 'astro:content'. Field lists, types,
 * required/optional and validation rules are authoritative in PLAN.md §4.
 *
 * SuperRefine rules beyond Astro's native field validation:
 *   a. Eastern-Arabic digit lint — U+0660–U+0669 rejected anywhere in frontmatter
 *   b. Cross-reference resolution — validated in the lesson route's getStaticPaths()
 *      because that is where both collections are in scope simultaneously
 *   c. Order uniqueness within module — validated in the lessons loader wrapper
 *      (post-load, after all entries are in the store)
 *   d. Slug-registry rule — deferred to a separate task (PLAN.md §4 rule 1)
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ── Eastern-Arabic digit lint ─────────────────────────────────────────────────
// PLAN.md §4 rule 6: reject U+0660–U+0669 anywhere in content/.
// This site uses Western numerals 0–9 exclusively (CLAUDE.md, C2).
const EAST_ARABIC_RE = /[\u0660-\u0669]/;

// ── ISO date, tolerant of YAML's helpfulness ─────────────────────────────────
// YAML parses a bare 2026-08-13 into a Date object, so `updated: 2026-08-13`
// and `updated: '2026-08-13'` reach the schema as different types. Rejecting
// the unquoted form would be a build failure whose message ("expected string,
// received object") says nothing about quotes — so accept both and normalise.
// Everything downstream (sitemap lastmod, RSS pubDate) gets a plain
// YYYY-MM-DD string either way.
const isoDate = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), 'updated must be ISO date YYYY-MM-DD.');

// ctx type: the second argument to z.superRefine callbacks.
// We use `any` for ctx to avoid importing internal Zod types ($RefinementCtx)
// that aren't exposed through astro:content's re-export.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rejectEastArabicDigits(data: unknown, ctx: any): void {
  if (EAST_ARABIC_RE.test(JSON.stringify(data))) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Eastern Arabic-Indic digits (U+0660–U+0669 / ٠١٢٣٤٥٦٧٨٩) are not permitted ' +
        'in frontmatter. Use Western numerals 0–9. (PLAN.md §4 rule 6, CLAUDE.md C2)',
    });
  }
}

// ── Lesson schema ─────────────────────────────────────────────────────────────
// PLAN.md §4 "Lesson frontmatter" — every field and rule is sourced there.

const MODULE_IDS = [
  'getting-started',
  'foundations',
  'ownership',
  'structuring',
  'abstraction',
  'practical',
] as const;

const lessonSchema = z
  .object({
    /** Arabic. 1–80 chars. */
    title: z.string().min(1).max(80),

    /**
     * Latin transliteration, unnumbered, stable. Pattern from PLAN.md §4.
     * Unique across all lessons. Registry-locked once published (separate task).
     */
    slug: z.string().regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Slug must be Latin lowercase letters/digits separated by single hyphens, ' +
        'no leading or trailing hyphens. e.g. "stack-heap"',
    ),

    /** Arabic, 80–160 chars. Becomes <meta name="description">. */
    description: z
      .string()
      .min(80, 'description must be at least 80 characters (SEO minimum).')
      .max(160, 'description must be at most 160 characters (SEO maximum).'),

    /**
     * Module the lesson belongs to. Must match the directory mapping:
     * 00-getting-started → getting-started, 01-foundations → foundations, …
     */
    module: z.enum(MODULE_IDS),

    /**
     * ≥ 1. Unique within its module. Gaps are allowed; duplicates fail the build.
     * Drives prev/next ordering and the ModuleProgress indicator.
     */
    order: z.number().int().min(1, 'order must be ≥ 1.'),

    /** 1–60. Honest reading estimate — not aspirational. */
    minutes: z.number().int().min(1).max(60),

    /**
     * Explicit. No default — forgetting it should be a build error, not a
     * silent publish. Published:false builds a noindex page (still reachable
     * by direct URL for phone review during leave).
     */
    published: z.boolean(),

    /**
     * 2–3 concrete bullets. The اللي هتفهمه opener (part 1 of the 7-part
     * lesson template — CURRICULUM.md §4).
     */
    summary: z.array(z.string()).min(2).max(3),

    /**
     * Lesson slugs. Each must resolve to an existing lesson.
     * Validation happens in [lesson].astro getStaticPaths().
     */
    prerequisites: z.array(z.string()).optional(),

    /**
     * Problem slugs. Each must resolve to an existing problem entry.
     * Validation happens in [lesson].astro getStaticPaths().
     */
    problems: z.array(z.string()).optional(),

    /**
     * Visual configuration.
     * - stepper: requires a co-located .steps.ts file.
     * - svg: requires a component in src/components/visuals/static/.
     * - none: no visual component.
     * Missing target is validated in [lesson].astro (file-system check).
     */
    visual: z
      .object({
        kind: z.enum(['stepper', 'svg', 'none']),
        src: z.string().optional(),
      })
      .optional(),

    /** ISO date YYYY-MM-DD. Used for sitemap lastmod and RSS pubDate. */
    updated: isoDate.optional(),
  })
  .superRefine(rejectEastArabicDigits);

// ── Problem schema ────────────────────────────────────────────────────────────
// PLAN.md §4 "Problem frontmatter".

const problemSchema = z
  .object({
    title: z.string().min(1),

    slug: z.string().regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Slug must be Latin lowercase letters/digits separated by single hyphens.',
    ),

    /** Arabic, 80–160 chars. */
    description: z.string().min(80).max(160),

    /**
     * Verbatim error or output text, English, rendered dir="ltr".
     * This is the SEO asset — people paste error text into search engines.
     * Arabic competition for these queries is near zero.
     */
    symptom: z.string().min(1),

    /**
     * e.g. "1.97.1". PLAN.md §4: required if symptom contains compiler output.
     * The tooling cannot detect whether symptom is compiler output, so this is
     * an authoring responsibility documented in CLAUDE.md §"Accuracy".
     */
    rustcVersion: z.string().optional(),

    published: z.boolean(),

    /**
     * Lesson slugs. Each must resolve to an existing lesson.
     * Validation happens in [slug].astro getStaticPaths() (problems route).
     */
    relatedLessons: z.array(z.string()).optional(),

    updated: isoDate.optional(),
  })
  .superRefine(rejectEastArabicDigits);

// ── Loader wrapper: order uniqueness within module ────────────────────────────
// PLAN.md §4 rule 2: duplicate order within a module fails the build.
// Gaps are allowed (lesson 1.4 is deferred). This cannot be expressed as a
// per-entry superRefine because each entry is validated independently.
// Solution: wrap the glob loader and run the check after all entries are loaded.

function lessonsLoader() {
  const inner = glob({ pattern: '**/*.mdx', base: './content/rust' });

  return {
    name: 'lessons-validated',
    async load(ctx: any): Promise<void> {
      // Delegate to the standard glob loader first.
      await inner.load(ctx);

      // Post-load: validate order uniqueness within each module.
      // At this point ctx.store contains the raw frontmatter (before zod
      // schema validation runs), so we check with typeof guards.
      const moduleOrders = new Map<string, Map<number, string>>();

      for (const [id, entry] of ctx.store.entries()) {
        const data = (entry as any)?.data ?? {};
        const mod: unknown = data.module;
        const order: unknown = data.order;
        if (typeof mod !== 'string' || typeof order !== 'number') continue;

        if (!moduleOrders.has(mod)) moduleOrders.set(mod, new Map());
        const seen = moduleOrders.get(mod)!;

        if (seen.has(order)) {
          throw new Error(
            `[content/lessons] Duplicate order value ${order} in module '${mod}': ` +
              `'${seen.get(order)}' and '${String(id)}'. ` +
              'Gaps are allowed; duplicates are not. (PLAN.md §4 rule 2)',
          );
        }
        seen.set(order, String(id));
      }
    },
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const collections = {
  /**
   * lessons — content/rust/**‌/*.mdx
   * URL shape: /rust/<module>/<slug>/ (module and slug from frontmatter,
   * never from directory numbers — CLAUDE.md §Slugs).
   */
  lessons: defineCollection({
    loader: lessonsLoader(),
    schema: lessonSchema,
  }),

  /**
   * problems — content/problems/*.mdx
   * URL shape: /problems/<slug>/
   */
  problems: defineCollection({
    loader: glob({ pattern: '*.mdx', base: './content/problems' }),
    schema: problemSchema,
  }),
};
