# Maarefa — Claude Code Prompts

## Setup before you start

```
repo/
  CLAUDE.md              project constraints + locked decisions
  PLAN.md                implementation plan; §8 governs task grouping
  docs/
    SITE_SPEC.md
    CURRICULUM.md
    VISUALS.md
    PROMPTS.md           this file
```

Run the prompts **in order**. Each is bounded with acceptance criteria. Do not merge them — agentic tools degrade badly on unbounded scope, and the point of the sequence is that you review between steps.

**Division of authority.** This file owns the **prompt sequence and the acceptance criteria**. `PLAN.md` §8 owns **task grouping, dependencies, and the cut order** — it is more granular and its phases do not map 1:1 onto these prompts (see the mapping table in §8). Where the two differ on grouping, §8 wins. Where they differ on what "done" means, this file wins.

**This file was written before the Prompt 0 rulings.** Items superseded by those rulings are corrected inline and marked. See `CLAUDE.md` §"Locked decisions".

---

# Prompt 0 — Understand and plan (no code)

Run this first. It produces a plan you review before any implementation time is spent.

> Read `CLAUDE.md` and all three documents in `docs/` completely before responding.
>
> **Write no implementation code in this task.** The deliverable is a plan.
>
> **Step 1 — Understand.** Inspect the repository as it currently exists. Then state back, in your own words and briefly, what this project is, who it is for, and the three constraints that shape it most. If anything in the specs is ambiguous, contradictory, or underspecified, list it — do not resolve it silently.
>
> **Step 2 — Ask.** Before planning, ask me every question you need answered. Cover at minimum:
> - Anything ambiguous from step 1
> - Choices the specs leave open (font selection, exact colour palette, package manager, Next.js version and router, testing approach)
> - Anything where you'd otherwise guess
>
> Ask them all at once. Wait for my answers before continuing to step 3.
>
> **Step 3 — Plan.** After I answer, write `PLAN.md` at the repo root containing:
>
> 1. **Stack decisions** — every library and version, with one line on why each is needed. Justify every dependency; the default answer is no dependency.
> 2. **Complete file and folder structure** — every directory and key file, annotated with its purpose.
> 3. **Routing map** — every route, whether static or dynamic, and what generates its params.
> 4. **Content schema** — MDX frontmatter fields with types, required vs optional, and validation rules.
> 5. **Component APIs** — for each of the four visual components: full prop types, state model, and the data format an author writes. `MemoryStepper` in the most detail; the types in `docs/VISUALS.md` are the starting point, refine them.
> 6. **Design tokens** — the full CSS variable set: colours (light and dark), type scale, spacing scale, and the memory-visual palette.
> 7. **Build pipeline** — every build step in order, including the Compiler Explorer fetch-and-cache step, sitemap generation, and internal link checking.
> 8. **Task breakdown** — ordered tasks with dependencies marked, grouped by the prompt sequence in `PROMPTS.md`. Flag which tasks are on the critical path.
> 9. **Risks** — what could go wrong technically, and the mitigation for each. Include specifically: RTL/LTR mixing inside `MemoryStepper`, mobile layout at 380px, and Compiler Explorer API availability.
> 10. **Open questions** — anything still unresolved after my answers.
>
> Be concrete. "Use a good Arabic font" is not a plan; naming the font, the subset, and the loading strategy is. Where the specs already decide something, carry the decision through rather than re-deciding it.
>
> **Acceptance:** `PLAN.md` exists, I have reviewed it, and I have said to proceed. Nothing is built until then.

---

# Prompt 1 — Foundation and first deploy

Goal: a live site today on **`maarefa.pages.dev`**, `noindex`. Content comes later.

> **Superseded:** this prompt originally said "live on the real domain today; the domain's age clock starts now." No domain is being purchased yet. Attaching a real domain to an existing Cloudflare Pages project later is a setting, not a migration, so nothing is lost by deferring. The domain moves to **Prompt 5**. See `ADDENDUM-hosting.md`.

> Follow `PLAN.md`. Build the foundation and deploy it.
>
> **1. Scaffold** — Next.js with `output: 'export'`, TypeScript, the structure from `PLAN.md`. No backend, no API routes, no middleware.
>
> **2. Design system**
> - CSS variables per `PLAN.md`, light and dark, dark as default with a toggle
> - Self-hosted subset Arabic and mono fonts, `font-display: swap`, preloaded
> - Arabic body line-height ≥ 1.8
> - Logical CSS properties throughout — no `margin-left`/`right` anywhere
>
> **3. RTL foundation** — this is the highest-risk piece; get it right before anything is built on top.
> - `dir="rtl"` on `<html>`
> - A `<CodeBlock>` component that is always `dir="ltr"`, with build-time Shiki highlighting
> - An `<InlineCode>` component with `dir="ltr"; unicode-bidi: isolate`
> - A test page mixing Arabic prose, inline English identifiers, code blocks, terminal output, and file paths. **Verify at 380px, 768px, and 1440px.**
>
> **4. Shell** — header, footer, and a landing page with the name, tagline, and a one-line description. Real content, not lorem ipsum.
>
> **5. Deploy** — Cloudflare Pages on the free `maarefa.pages.dev` subdomain, HTTPS. Document the build command and output directory in `README.md`. Add `robots.txt` disallowing crawl, and a minimal `sitemap.xml`. Set `X-Robots-Tag: noindex` at the header level in `_headers` so it cannot be forgotten per-page. Both derive from whether `SITE_URL` points at a `pages.dev` host or a real domain — attaching the domain is then one value plus a redeploy.
>
> **Acceptance**
> - Site is live on `maarefa.pages.dev`, `noindex` verified at the header level
> - Lighthouse ≥ 95 mobile on performance, accessibility, best practices, SEO
> - **Zero JavaScript on the landing page** ← measured, not assumed. See the note below.
> - The RTL test page renders correctly at 380px, 768px and 1440px — code never reordered, error text readable
> - Zero console errors

**Note on the zero-JS criterion.** This was measured at the start of Prompt 1 against both candidate frameworks, on an identical prose page:

| | prose page | page with a React island |
|---|---|---|
| Next.js 16.3.0, `output: 'export'` | 129.5 KB gzip | 129.5 KB + component |
| Astro 7.2.1 | **0 bytes** | 59.5 KB gzip, deferred |

Next App Router ships its client runtime on every page; there is no supported way to emit a JS-free page. **This criterion is unachievable on Next and exactly satisfied on Astro.**

---

# Prompt 2 — Content pipeline and Module 0

Module 0 is prose-only, which makes it the right way to prove the pipeline before visuals complicate it.

> **1. Content pipeline**
> - MDX loading from `content/`, frontmatter typed and validated at build (fail the build on invalid frontmatter, don't warn)
> - `generateStaticParams` for lesson and problem routes
> - The seven-part lesson template from `docs/CURRICULUM.md` §4 as reusable components
> - Prev/next navigation derived from module and order, never hand-maintained
> - Module progress indicator
>
> **2. Track overview page** `/rust` — all six modules with lesson lists. Unwritten lessons show as `قادم قريباً`, not links. The full shape of the track is visible from day one.
>
> **3. Module 0, four lessons** — content per `docs/CURRICULUM.md`:
> - `0.1` ليه Rust؟ وإيه اللي هتتعلمه
> - `0.2` تثبيت Rust
> - `0.3` تجهيز بيئة العمل
> - `0.4` أول برنامج
>
> These carry inline warnings at the exact point each documented failure occurs, each linking to its `/problems` page. That integration is the module's whole design — do not write generic setup instructions.
>
> **Ask me for the Arabic prose, or draft it for my review — do not invent technical claims.** Every command must be one that actually works; every path must be a real path.
>
> **4. One static SVG** — the project-structure diagram for `0.4`, showing where the binary lands and that on Linux it has no extension.
>
> **Acceptance**
> - Four lessons live, correct at 380px
> - Zero JS on all four (no visuals yet)
> - Frontmatter validation fails the build when broken
> - Prev/next correct across all four
> - `/rust` shows the full track shape
> - Every command in the lessons verified to work

---

# Prompt 3 — MemoryStepper and the flagship lessons

The highest-risk and highest-value task in the project. Read `docs/VISUALS.md` fully first.

> **1. Build `MemoryStepper`** per `docs/VISUALS.md` §3.1 and the API in `PLAN.md`.
>
> Requirements:
> - SVG rendering, all colours from CSS variables
> - Consistent visual vocabulary: stack = sharp rectangles, heap = rounded blocks, states distinguished by border style *and* opacity, not colour alone
> - Composite values decomposed — `String` renders as ptr/len/cap on the stack with an arrow to heap bytes
> - CSS transitions on SVG attributes, ~250ms; `prefers-reduced-motion` disables them
> - Next/previous, arrow keys, swipe on touch. **No autoplay.**
> - Desktop: code and memory side by side. **Mobile ≤ 640px: stacked, controls ≥ 44px.**
> - Mixed direction inside one component — code and memory panels LTR, explanation and controls RTL
> - Loaded only on pages that use it
>
> **2. Author two visuals as data**, in co-located `.steps.ts` files:
> - `2.1` الستاك والهيب — ~6 steps
> - `2.2` الملكية والنقل — 7 steps, exactly as specified in `docs/VISUALS.md` §4
>
> For `2.2` step 6, the compiler error must be **the real message from an actual failed compilation** — compile the broken version and copy the output verbatim.
>
> **3. Write both lessons** using the standard template.
>
> **Acceptance**
> - Both lessons live and correct at 380px, 768px, 1440px
> - Adding a third visual requires writing only a data file — **verify this by actually doing it** with a small throwaway example, then delete it
> - Keyboard navigable; screen reader reads each step's explanation
> - Reduced-motion respected
> - Component bundle absent from pages that don't use it
> - Every error message verbatim from real output

---

# Prompt 4 — Module 1 and the problems library

> **1. Module 1, three lessons** — `1.1`–`1.3` per `docs/CURRICULUM.md`. **All written from scratch** — the earlier PDF drafts are personal study notes built around someone else's video course and are deliberately not a source. Cargo material lives in `0.4`; each lesson carries a "what you'll understand" opener and an exercise with a collapsible solution.
>
> **2. Three static SVGs**
> - `1.1` shadowing vs mutation, two panels
> - `1.2` integer ranges to scale, with overflow marked
> - `1.3` expression vs statement, semicolon highlighted as the difference
>
> **3. ~~`FlowDiagram` component for `1.4`~~ — deferred.** Lesson `1.4` moves to leave period 2 and `FlowDiagram` to period 3; when `1.4` lands it gets a static SVG. Control flow is not a prerequisite for ownership, so the launch arc survives intact, and `MemoryStepper` stays the only component on the critical path. If it lands early, `1.4` is the first thing to add back.
>
> **4. Problems library** — `/problems` index and five entries:
> `linux-binary-no-extension` · `rust-analyzer-not-working` · `cargo-command-not-found-vscode` · `borrow-checker-first-errors` · `string-vs-str-mismatch`
>
> Format per entry: verbatim symptom → cause → fix → why it happens → related lesson. **The symptom must be the exact error text**, since that string is what people paste into search.
>
> **5. Cross-linking** — lessons link to relevant problems, problems link back to lessons.
>
> **Acceptance**
> - **Nine** lessons total live, all correct at 380px
> - Five problem pages with verbatim error text, each stamped with the rustc version that produced it
> - All cross-links resolve; build fails on a broken internal link
> - Lighthouse ≥ 95 mobile on a sample of lesson and problem pages

---

# Prompt 5 — Community, admin, launch readiness

> **1. Giscus** — GitHub Discussions on the public repo. One thread per lesson plus a `/discuss` board. Lazy-loaded below the fold, never blocking render. Pin a notice in Arabic stating the reply schedule and that community answers are welcome in between.
>
> **2. Problem submission** — a "واجهتك مشكلة؟" link opening a prefilled GitHub issue template labelled `problem-report`. No backend.
>
> **3. Admin page** `/admin`, `noindex`, unlinked, gated by Cloudflare Access.
>
> Build-time panels: lesson status (published/draft/missing), visual coverage, assembly cache freshness, problem counts, internal link check results.
>
> Live panels via client-side GitHub **REST** (public repo, no auth): open `problem-report` issues, sorted oldest-first.
>
> **Superseded:** this originally also asked for an unanswered-discussions panel "via client-side GitHub API, no auth". That is not buildable — Discussions is exposed only through GraphQL, and GraphQL requires a token unconditionally, so a static page cannot query it. Issues *are* readable unauthenticated over REST v3 (60 req/hr/IP), so that panel is unaffected. The GitHub mobile app already pushes notifications for unanswered discussions, so the panel would have duplicated a working channel while adding a moving part that fails silently during leave. See `SITE_SPEC.md` §6.2 for the follow-on option, which is deliberately not built now.
>
> The live panel is the point — it must be usable on a phone.
>
> **4. SEO**
> - Unique title and meta description per page, derived from content
> - Canonical URLs; slugs frozen
> - Schema.org: `Course` on `/rust`, `TechArticle` on lessons, `FAQPage` on problems
> - Breadcrumbs; complete `sitemap.xml`
> - **No page generated for content that doesn't exist.** Thin pages damage the whole domain.
>
> **5. Analytics** — Cloudflare Web Analytics only. Nothing else, no custom events yet.
>
> **6. About page** — I will supply the text: real name, background, why this exists.
>
> **7. Attach the real domain** — moved here from Prompt 1. Point `SITE_URL` at it, which flips `noindex` off and switches canonicals and `sitemap.xml` to absolute real-domain URLs. Configure the Cloudflare Access application for `/admin` on that domain.
>
> **Acceptance**
> - Giscus works; a test discussion posts and appears
> - `/admin` gated, and its live panel loads correctly on a phone
> - `sitemap.xml` complete and accurate
> - **Real domain attached, `noindex` lifted, Search Console verified against the real domain**, sitemap submitted
> - Full-site link check passes
> - Lighthouse ≥ 95 mobile across a sample of every page type

---

## Rules while working

- If Claude Code proposes a backend, a database, an API route, Vercel, or a paid service — reject it and point at `CLAUDE.md`.
- If it writes an error message or assembly output without compiling something first, reject it. Invented technical output is the one unrecoverable failure mode here.
- Keep `CLAUDE.md` current. When an architectural decision is made mid-build, record it there so later sessions inherit it.
- After each prompt: review, commit, deploy. Never run two prompts without deploying in between.
