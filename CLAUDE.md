# CLAUDE.md — Maarefa

Project context. Read fully before making any change.

**Maarefa** (معرفة) · Arabic Technical Knowledge — *Learn what happens beneath the code.*

An Arabic-first learning platform for systems programming, launching with a Rust track. Its value is in three things that barely exist in Arabic: visual explanations of memory mechanics, generated assembly shown beside source, and a troubleshooting library written from real debugging.

> The name was **Fikra** in early drafts. It is **Maarefa** now, everywhere. If you find "Fikra" in any file, it is stale — fix it.

Specifications live in `docs/`:
- `docs/SITE_SPEC.md` — architecture, admin page, analytics
- `docs/CURRICULUM.md` — brand, lesson list, launch scope
- `docs/VISUALS.md` — the visual system (read before building any visual)
- `docs/PROMPTS.md` — the bounded prompt sequence; work is executed in that order

`PLAN.md` at the repo root is the implementation plan. Where `PLAN.md` and `docs/` disagree on a detail that §"Locked decisions" below covers, this file wins.

---

## Hard constraints

### The author is offline ~20 days per month, phone only

No laptop for two thirds of every month. **Nothing may require regular attention to keep working.**

- No process that needs monitoring, restarting, or babysitting
- No service with a free tier that auto-pauses on inactivity
- Anything requiring moderation is delegated to GitHub (manageable from a phone)
- Prefer build-time work over runtime work, always

### Infrastructure must be free and static

- Host: **Cloudflare Pages**. Unlimited bandwidth, commercial use permitted.
- **Never suggest Vercel.** The Hobby plan prohibits commercial use and hard-pauses at quota, taking the site offline.
- **No backend. No database. No API routes. No server actions. No middleware.** Next.js with `output: 'export'` only.
- No paid services. The domain is the only cost.
- If a feature seems to need a server, it is the wrong feature — find the static equivalent or defer it.

### Accuracy is non-negotiable

This is teaching material. A wrong explanation teaches a wrong mental model that persists for years.

- **Never invent Rust behaviour.** If unsure how something compiles or behaves, verify against real output — do not reason it out and present it as fact.
- Assembly shown to learners must come from an actual compilation, never hand-written or imagined.
- Error messages quoted in lessons and problem pages must be **verbatim** from a real compiler run. Approximate error text is worse than none — people search for the exact string.
- Every quoted error and every assembly panel **displays the rustc version it came from**. Error wording drifts between releases; an unversioned quote rots silently.
- If a claim can't be verified, cut it rather than hedge it.

### Quoted compiler output is never load-bearing for comprehension

**When a lesson quotes compiler output, the Arabic prose must independently convey what the critical lines say. A learner who never scrolls the block must still get the full lesson.** The verbatim text is there for authenticity and for search — it is not the teaching.

This is not a style preference; it follows from measurement. A real `E0382` block is 100 columns at its widest. A 380px phone shows 52, a 320px phone shows 43, and no amount of type-shrinking reaches 100 without becoming unreadable — the arithmetic is in `PLAN.md` §9 R-14. Wrapping is not an option either: rustc diagnostics are column-aligned, and carets stop meaning anything the moment a line reflows. So the block scrolls, with an edge shadow marking that it does.

That means the reader on a phone sees the headline and the code context, and must scroll for the explanation. **The explanation is therefore duplicated in Arabic, in the prose or in the visual's step text.**

Where this bites hardest is **lesson 2.2, step 6**. The line that gets cut is:

```
-- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
```

That is the single most important sentence in the entire error — it is the *reason* the move happened. It must appear as Arabic explanation in the `MemoryStepper` step, not only inside the scrollable block.

The verbatim text stays in the DOM regardless, so nothing is lost for search.

### Code renders as the characters actually typed

No font ligatures, ever. `->` must look like a hyphen and a greater-than sign, not an arrow. A beginner cannot type a glyph they have never seen. This generalises past fonts: **nothing on this site may render code as anything other than what a learner would type into their editor** — no prettified operators, no substituted glyphs, no elided tokens.

---

## Locked decisions

These supersede anything in `docs/` that contradicts them. Recorded so later sessions inherit them instead of re-deriving them.

### Corrections to the original specs

| # | Was | Is |
|---|---|---|
| E1 | Compiler Explorer called with `options=-O2` | `-O2` is a GCC/Clang flag; rustc rejects it. Use **`-C opt-level=2`**. The godbolt compiler ID is **pinned in config**, never "latest". |
| E2 | Admin discussions queue via "client-side GitHub API, no auth needed" | **Impossible.** GitHub Discussions is GraphQL-only and GraphQL always requires a token. Discussions panel is **dropped**; the GitHub mobile app already notifies. Issues (`problem-report`) *do* work unauthenticated over REST at 60 req/hr/IP — that panel stays. |
| E3 | Return-visitor rate from Cloudflare Web Analytics | CF Web Analytics is cookieless and does not report it. Replaced by **deep-lesson ratio**: pageviews on `2.1`+`2.2` ÷ pageviews on `0.1`. Measures the same thing from pageview counts alone. |
| E4 | Arabic font shortlist included Rubik | Rubik ships **no Arabic glyphs**. Face is **IBM Plex Sans Arabic**; mono is **JetBrains Mono, ligatures off**. |
| E5 | `Step` type in `VISUALS.md` §3.1 | Could not express frames, note text, slice windows, conflicts, or multi-line highlight. **Superseded by `PLAN.md` §5**, which is the authoritative schema. |

### Contradictions resolved

| # | Resolution |
|---|---|
| C1 | Lesson **1.4 moves to leave period 2**. `FlowDiagram` stays a period-3 component. When 1.4 lands it gets a static SVG. `MemoryStepper` is the only component on the launch critical path. |
| C2 | **Western numerals everywhere**, stepper controls included — `الخطوة 3 / 7`, never `٣ / ٧`. |
| C3 | The rule is **"no framework, no hydration, no component JavaScript on prose pages"** — not literally zero bytes. Three exceptions are allowed and budgeted: the inline anti-FOUC theme script, the Cloudflare Analytics beacon, and a lazily-mounted Giscus. A **per-page byte budget is asserted in the build; exceeding it fails the build.** |
| C4 | **Single public repo** (`maarefa`), Discussions enabled, Giscus on the same repo. |
| C5 | Progress is a **static, build-time position indicator** ("lesson 4 of 9"). No localStorage, no read tracking. |
| C6 | Launch is **link-out only** to play.rust-lang.org. Inline execution is period 2. |
| — | **`/playground` is removed from the IA.** It would be a thin page, and lessons link to the Playground where the code actually is. Thin pages damage the domain. |
| — | **Framework is Astro 7.2.1 with Preact islands, not Next.js.** Decided on measurement at P1: an identical prose page ships 129.5 KB gzip on Next 16.3 against 0 bytes on Astro, against a 70 KB threshold. Island runtime measured at 7.5 KB for Preact vs 59.5 KB for React. `output: 'export'` in the constraints above now means Astro's static build. Preact is provisional until `MemoryStepper` is verified against it at P3 — fallback is `@astrojs/react`, one config line. |
| — | **Deploy target is `maarefa.pages.dev` with `noindex` until P6.** No domain purchased yet; attaching one to an existing Pages project later is a setting, not a migration. `noindex` is set in `_headers` and derives from `SITE_URL`. See `docs/ADDENDUM-hosting.md`. |
| — | **Lighthouse ≥ 95 mobile** on performance, accessibility, best practices and SEO is a hard acceptance gate, and RTL is verified at **380px, 768px and 1440px** — not 380px alone. From `docs/PROMPTS.md`. |
| — | **After each prompt: review, commit, deploy.** Never run two prompts without deploying in between. From `docs/PROMPTS.md`. |

### Launch scope

**9 lessons, all written from scratch.** Modules 0 (0.1–0.4), 1 (1.1–1.3), 2 (2.1–2.2).

Earlier drafts of 1.1–1.3 exist as personal PDF study notes structured around someone else's video course. **They are not a source for this site and nothing carries over from them.** The curriculum in `docs/CURRICULUM.md` is the sole structural authority — its ordering is deliberate and diverges from typical course ordering (ownership arrives in module 2, much earlier than most).

---

## Architecture

```
Content        MDX in git
Build          Next.js static export
Host           Cloudflare Pages
Assembly       Compiler Explorer API at BUILD time → cached in git
Run code       play.rust-lang.org (link out)
Community      GitHub Discussions via Giscus
Analytics      Cloudflare Web Analytics + Google Search Console
Admin gate     Cloudflare Access
```

### Build-time assembly, never a runtime iframe

Compiler Explorer's iframe is a full IDE with draggable panes — unusable at 380px, and this site is mobile-first. Instead, call the REST API during the build, render a custom responsive view, and cache the result.

```
POST https://godbolt.org/api/compiler/<pinned-id>/compile
Body: source · Query: options=-C opt-level=2, filters · Header: Accept: application/json
```

The response's `asm[].source.line` gives source-line ↔ assembly-line mapping, which is what makes the custom side-by-side view possible.

**Caching is mandatory.** Hash the code block, store the result under `cache/asm/`, commit it. Compiler Explorer is a donation-funded free service handling millions of compilations weekly — never re-fetch what is already cached, and never call it at runtime. Short links are generated once at build and committed too, never regenerated.

### Four components, not twenty-three visuals

The expensive mistake would be hand-building each visual. Build four components; author every visual as a typed data array.

| Component | Covers |
|---|---|
| `MemoryStepper` | all of module 2, Vec growth, struct layout — ~7 visuals |
| `LifetimeTimeline` | lifetimes |
| `FlowDiagram` | match, Option, Result, control flow |
| static SVG | everything that doesn't change state |

`MemoryStepper` is the critical piece. **Its schema is fixed against all seven planned visuals before any component code is written** — a schema change discovered at lesson 2.4 would force a rewrite of everything authored before it, possibly during a period with no laptop. Schema lives in `PLAN.md` §5. **Read `docs/VISUALS.md` before touching it.**

---

## RTL — the detail that breaks Arabic technical sites

`dir="rtl"` on `<html lang="ar">`, **but**:

- **Every code block, terminal output, file path, and error message must be `dir="ltr"`.** Without this, bidirectional reordering mangles code and makes error messages unreadable.
- Inline code inside Arabic prose: `dir="ltr"; unicode-bidi: isolate`
- Logical CSS properties only — `margin-inline-start`, never `margin-left`
- Western numerals (0-9) throughout — standard in Egyptian technical writing
- The `MemoryStepper` mixes directions inside one component: code and memory panels LTR, explanation and controls RTL. **Test this explicitly at 380px.**

The **Playwright 380px mixed-direction check is part of the definition of done**, not optional tooling. It is the one failure mode that cannot be caught from a phone and the one most likely to regress silently.

---

## Conventions

- **Arabic** for all learner-facing copy, Egyptian register, teaching voice — explain *why*, not just the rule
- **English** for code, identifiers, error messages, comments, commit messages, and file names. Never translate identifiers or error text.
- Slugs: Latin transliteration, **unnumbered**, stable, **never regenerated once published** — they get indexed. Ordering lives in frontmatter; directories on disk stay numbered for authoring convenience. The curriculum has already renumbered once and will again — numbers must never reach a URL.
- **No framework, no hydration, no component JavaScript on prose pages.** Components are per-page islands. Byte budget enforced at build.
- Syntax highlighting at build time (Shiki) — no highlighter shipped to the client
- No animation libraries. CSS transitions on SVG attributes are sufficient.
- All colours as CSS variables so dark mode and print are free
- `prefers-reduced-motion` disables transitions without disabling functionality
- Commit after every completed task

---

## Repository layout

```
docs/                         specifications — correct them when they are wrong, don't drift
PLAN.md                       implementation plan; MemoryStepper schema is authoritative here
content/
  rust/<module>/<lesson>.mdx
  rust/<module>/<lesson>.steps.ts    visual data, co-located
  problems/<slug>.mdx
cache/asm/<hash>.json         committed — never re-fetched
components/
  visuals/                    the four components
  lesson/                     lesson page parts
app/                          Next.js routes
scripts/                      build-time: asm fetch, sitemap, link check, budget check
```

`cache/` and `content/` are committed. Git history is the audit trail.

---

## Out of scope — do not build unprompted

CUDA track · paid product or paywall · user accounts · progress sync or read tracking · notifications · comparison tools · a custom analytics dashboard · inline code execution (launch uses link-out only) · English translations · site search · PWA/offline · `/playground` · per-lesson OG images (period 2)

Each is planned for a later phase, or deliberately dropped. Adding any now delays the critical path.

---

## Definition of done for a lesson

- [ ] Follows the seven-part template (see `docs/CURRICULUM.md` §4)
- [ ] Every code sample compiles — verified, not assumed
- [ ] Every quoted error message is verbatim from a real compiler run, with its rustc version shown
- [ ] **Every critical line of quoted compiler output is also conveyed in the Arabic prose** — a reader who never scrolls the block still gets the lesson
- [ ] Visual present where the curriculum specifies one
- [ ] **Playwright 380px mixed-direction check passes**
- [ ] Code blocks are `dir="ltr"`; no ligatures
- [ ] Western numerals throughout
- [ ] Links to relevant `/problems` entries
- [ ] Prev/next navigation correct
- [ ] Internal link check passes (broken internal link fails the build)
- [ ] Per-page JS byte budget passes
- [ ] Zero console errors, no component JS if the lesson has no visual
