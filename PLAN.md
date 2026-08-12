# Maarefa — Implementation Plan

**Status:** written during Prompt 0. Nothing is built. Awaiting review.

This plan carries through decisions already made in `CLAUDE.md` and `docs/`; it does not re-open them. Where the specs were wrong (E1–E5) or contradicted themselves (C1–C6), the corrections are recorded in `CLAUDE.md` §"Locked decisions" and applied throughout the specs — this plan assumes them.

Three inputs referenced in the answers did not arrive, and each is called out where it bites: `docs/PROMPTS.md` (affects §8), the domain (§7), and the corrected doc copies (§10). The doc corrections were applied by hand from the enumerated instructions instead — see §10 for what to reconcile.

---

## 1. Stack decisions

Every version is pinned exactly. No carets. A caret is a change that arrives while you have no laptop.

### Runtime dependencies

| Package | Version | Why it is here |
|---|---|---|
| `next` | 16.3.0 | The chosen framework. `output: 'export'`, App Router, no runtime. |
| `react` | 19.2.8 | Required by Next 16. |
| `react-dom` | 19.2.8 | Required by Next 16. |

Three runtime dependencies. That is the whole client surface.

### Build-time dependencies (never shipped)

| Package | Version | Why it is here |
|---|---|---|
| `@mdx-js/mdx` | 3.1.1 | Compiles MDX from `content/` to RSC output. Content lives outside `app/`, so Next's file-routed MDX doesn't apply — `compile()` + `run()` is called directly in a Server Component. |
| `gray-matter` | 4.0.3 | Frontmatter parsing. Hand-rolling YAML parsing is the wrong place to save a dependency. |
| `zod` | 4.4.3 | Frontmatter schema validation with useful errors. The build must reject a malformed lesson, not render it wrong. |
| `shiki` | 4.4.3 | Build-time syntax highlighting, per `CLAUDE.md`. Custom TextMate theme authored to match §6, so no library skin ships. |
| `remark-gfm` | 4.0.1 | Tables in lesson prose. The lesson template uses them heavily. |
| `rehype-slug` | 6.0.0 | Heading IDs for deep links into long lessons. |
| `rehype-autolink-headings` | 7.1.0 | The anchor affordance on those headings. |

### Tooling

| Package | Version | Why it is here |
|---|---|---|
| `typescript` | 7.0.2 | Type checking. `.steps.ts` files are typed so authoring errors are caught at build, which is the entire premise of the visual system. |
| `@types/react`, `@types/react-dom`, `@types/node` | matched | Types. |
| `vitest` | 4.1.10 | Unit tests for the pure build logic: frontmatter schema, slug registry, asm cache hashing, link checker, budget checker. |
| `@playwright/test` | 1.62.1 | **The 380px mixed-direction check.** Part of the definition of done, not optional tooling. Runs in GitHub Actions, not in the Cloudflare Pages build. |

Package manager: **pnpm 10.33.4**, pinned via `packageManager` in `package.json`. Node **22**, pinned via `.node-version`.

### Rejected dependencies, and why

| Rejected | Instead |
|---|---|
| Tailwind | CSS Modules + a tokens file. Logical properties and mixed-direction layout are the entire difficulty of this project; a utility layer obscures exactly the thing that has to stay explicit. |
| Contentlayer | Unmaintained. `gray-matter` + `zod` + ~120 lines. |
| `next-mdx-remote` | A wrapper over `@mdx-js/mdx`, which we call directly. |
| `rehype-pretty-code` | Wraps Shiki with features we'd disable. We need custom control over `dir="ltr"`, the three block tiers, and the assembly view anyway. |
| `@giscus/react` | A React wrapper over a `<script>` tag with data attributes. Hand-rolled in ~30 lines, lazily mounted, and we control when the JS loads. |
| `framer-motion` / any animation library | CSS transitions on SVG attributes, per `CLAUDE.md`. |
| `sharp` | `images: { unoptimized: true }` — static export has no image optimiser. |
| `next-sitemap` | ~80 lines in `scripts/`, and we need custom draft/noindex exclusion regardless. |
| ESLint + Prettier | `tsc --noEmit` under `strict` catches what matters in a solo repo; formatting churn isn't worth the transitive dependency tree. Revisit if a second author appears. |
| `clsx`, `date-fns`, icon packs | Template literals, `Intl.DateTimeFormat`, inline SVG. |

---

## 2. File and folder structure

```
maarefa/
├── CLAUDE.md                        project constraints; read every session
├── PLAN.md                          this file
├── LICENSE                          MIT — applies to code
├── LICENSE-CONTENT                  CC BY-NC-SA 4.0 — applies to content/ and docs/
├── README.md                        what this is, how to run, how to author a lesson
├── .node-version                    22
├── .gitignore
├── package.json                     packageManager: pnpm@10.33.4
├── pnpm-lock.yaml                   committed
├── next.config.mjs                  output: 'export', trailingSlash, images.unoptimized
├── tsconfig.json                    strict, paths: @/*
├── playwright.config.ts             380px project + desktop project
├── vitest.config.ts
│
├── docs/                            specifications
│   ├── SITE_SPEC.md
│   ├── CURRICULUM.md
│   ├── VISUALS.md
│   └── PROMPTS.md                   ← NOT PRESENT; see §10
│
├── content/
│   ├── .slug-registry.json          append-only; published slugs can never change
│   ├── rust/
│   │   ├── 00-getting-started/
│   │   │   ├── 01-why-rust.mdx
│   │   │   ├── 02-install.mdx
│   │   │   ├── 03-editor-setup.mdx
│   │   │   └── 04-first-program.mdx
│   │   ├── 01-foundations/
│   │   │   ├── 01-variables.mdx
│   │   │   ├── 02-data-types.mdx
│   │   │   └── 03-functions.mdx
│   │   └── 02-ownership/
│   │       ├── 01-stack-heap.mdx
│   │       ├── 01-stack-heap.steps.ts       ← visual data, co-located
│   │       ├── 02-move.mdx
│   │       └── 02-move.steps.ts             ← the flagship
│   └── problems/
│       ├── linux-binary-no-extension.mdx
│       ├── rust-analyzer-not-working.mdx
│       ├── cargo-command-not-found-vscode.mdx
│       ├── borrow-checker-first-errors.mdx
│       └── string-vs-str-mismatch.mdx
│
├── cache/
│   └── asm/<hash>.json              committed; never re-fetched; never fetched in CI
│
├── app/
│   ├── layout.tsx                   <html lang="ar" dir="rtl">, fonts, theme script
│   ├── page.tsx                     landing
│   ├── not-found.tsx                designed 404
│   ├── globals.css                  imports tokens.css, resets, prose, print
│   ├── rust/
│   │   ├── page.tsx                 track overview, module map, static progress
│   │   └── [module]/[lesson]/page.tsx
│   ├── problems/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── discuss/page.tsx
│   ├── about/page.tsx
│   └── admin/page.tsx               noindex, unlinked, Cloudflare Access gated
│
├── components/
│   ├── visuals/
│   │   ├── MemoryStepper/
│   │   │   ├── index.tsx            'use client' — the only launch island
│   │   │   ├── StackPanel.tsx
│   │   │   ├── HeapPanel.tsx
│   │   │   ├── Connections.tsx      pointer / borrow / invalid arrows
│   │   │   ├── Controls.tsx         RTL; ≥44px targets
│   │   │   ├── MemoryStepper.module.css
│   │   │   └── types.ts             ← the schema in §5; imported by every .steps.ts
│   │   ├── LifetimeTimeline/        period 3
│   │   ├── FlowDiagram/             period 3
│   │   └── static/                  hand-authored inline SVGs (0.4, 1.1, 1.2, 1.3)
│   ├── lesson/
│   │   ├── LessonLayout.tsx
│   │   ├── CodeBlock.tsx            dir="ltr"; tier: plain | runnable | showAsm
│   │   ├── AsmPanel.tsx             build-time assembly + rustc version stamp
│   │   ├── PlaygroundLink.tsx
│   │   ├── Exercise.tsx             <details>, zero JS
│   │   ├── ProblemLinks.tsx
│   │   ├── PrevNext.tsx
│   │   └── ModuleProgress.tsx       static position indicator
│   ├── Giscus.tsx                   'use client', IntersectionObserver-mounted
│   ├── ThemeToggle.tsx              'use client', tiny
│   └── admin/IssueQueue.tsx         'use client', unauthenticated GitHub REST
│
├── lib/
│   ├── site.ts                      SITE_URL and other single-source constants
│   ├── content.ts                   read + validate + sort lessons and problems
│   ├── schema.ts                    zod schemas (§4)
│   ├── mdx.ts                       compile pipeline, Shiki, rehype/remark chain
│   └── asm.ts                       cache read + hash
│
├── scripts/
│   ├── validate-content.ts          frontmatter, slug registry, cross-refs
│   ├── fetch-asm.ts                 Compiler Explorer fetch + shortlink + cache
│   ├── build-feeds.ts               sitemap.xml, robots.txt, rss.xml
│   ├── check-links.ts               internal = fail, external = warn
│   ├── check-budget.ts              per-route JS bytes, fails the build
│   └── contrast.ts                  re-verifies §6 ratios; run when tokens change
│
├── public/
│   ├── fonts/                       subset WOFF2, committed
│   ├── og-default.png               one static card at launch
│   └── _headers                     immutable cache for /fonts and /_next/static
│
├── styles/
│   ├── tokens.css                   §6, the whole variable set
│   └── shiki-maarefa.json           custom syntax theme matching the palette
│
└── .github/workflows/ci.yml         tsc, vitest, playwright 380px, budget
```

---

## 3. Routing map

Static export, `trailingSlash: true`. Every route is prerendered to HTML at build.

| Route | Kind | Params generated from |
|---|---|---|
| `/` | static | — |
| `/rust/` | static | reads all published lessons at build for the module map |
| `/rust/[module]/[lesson]/` | dynamic | `generateStaticParams` over `content/rust/**/*.mdx`: `module` = frontmatter `module`, `lesson` = frontmatter `slug`. Drafts are included with `noindex` (see §4). |
| `/problems/` | static | index over `content/problems/*.mdx` |
| `/problems/[slug]/` | dynamic | `generateStaticParams` over `content/problems/*.mdx`, `slug` = frontmatter `slug` |
| `/discuss/` | static | — |
| `/about/` | static | — |
| `/admin/` | static, `noindex` | build-time inventory embedded as JSON; issue queue fetched client-side |
| `/404.html` | static | `not-found.tsx` |
| `/sitemap.xml`, `/robots.txt`, `/rss.xml` | emitted post-export by `scripts/build-feeds.ts` | walks `out/` |

**Directory numbers never reach a URL.** `content/rust/02-ownership/02-move.mdx` with `module: ownership, slug: move` serves at `/rust/ownership/move/`. Ordering lives in frontmatter. The curriculum has already renumbered once — module 0 was inserted ahead of an existing module 1, and Cargo material moved from 1.x to 0.4 — and it will again.

Launch routes: 1 landing + 1 track + 9 lessons + 1 problems index + 5 problems + discuss + about + admin + 404 = **20 pages.**

---

## 4. Content schema

Validated by `zod` in `scripts/validate-content.ts`, which runs before `next build`. A schema failure fails the build with the file path and the offending field.

### Lesson frontmatter

| Field | Type | Req | Rules |
|---|---|---|---|
| `title` | string | ✔ | Arabic. 1–80 chars. |
| `slug` | string | ✔ | `^[a-z0-9]+(-[a-z0-9]+)*$`. Latin transliteration, unnumbered. Unique across all lessons. **Registry-locked** — see below. |
| `description` | string | ✔ | Arabic, 80–160 chars. Becomes `<meta name="description">`; outside that range it is truncated or useless in search results. |
| `module` | enum | ✔ | `getting-started` \| `foundations` \| `ownership` \| `structuring` \| `abstraction` \| `practical`. Must match the containing directory's mapping. |
| `order` | int | ✔ | ≥ 1, unique within `module`. Drives prev/next and the position indicator. |
| `minutes` | int | ✔ | 1–60. Honest reading estimate. |
| `published` | boolean | ✔ | Explicit. No default — forgetting it should be an error, not a silent publish. |
| `summary` | string[] | ✔ | 2–3 items. The **اللي هتفهمه** opener, part 1 of the seven-part template. |
| `prerequisites` | string[] | — | Lesson slugs. Each must resolve to an existing lesson, and must have a lower `(module order, order)` than this one — a cycle fails the build. |
| `problems` | string[] | — | Problem slugs. Each must resolve. Part 7 of the template. |
| `visual` | object | — | `{ kind: 'stepper' \| 'svg' \| 'none', src?: string }`. `stepper` requires a co-located `.steps.ts`; `svg` requires a component in `components/visuals/static/`. Missing target fails the build. |
| `updated` | ISO date | — | `lastmod` in sitemap, `pubDate` in RSS. Defaults to git commit date if absent. |

### Problem frontmatter

| Field | Type | Req | Rules |
|---|---|---|---|
| `title` | string | ✔ | Arabic. |
| `slug` | string | ✔ | Same rules as lesson slugs; registry-locked. |
| `description` | string | ✔ | 80–160 chars. |
| `symptom` | string | ✔ | **Verbatim** error or output text, English, rendered `dir="ltr"`. This is the SEO asset — it is what people paste into search. |
| `rustcVersion` | string | ✔ if `symptom` contains compiler output | e.g. `1.97.1`. Displayed beside the symptom. |
| `published` | boolean | ✔ | Explicit. |
| `relatedLessons` | string[] | — | Lesson slugs; must resolve. |
| `updated` | ISO date | — | As above. |

### Validation rules beyond the field schemas

1. **Slug registry.** `content/.slug-registry.json` maps `slug → { firstPublished, path }`, append-only. If a slug is in the registry and the file's slug changes, **the build fails.** This is the mechanism that enforces "never regenerated once published" — a rule that is otherwise only a good intention.
2. **Order uniqueness** within a module; gaps are allowed (1.4 is absent at launch), duplicates are not.
3. **Cross-reference resolution** for `prerequisites`, `problems`, `relatedLessons` — a dangling slug fails the build.
4. **Visual target existence**, per the `visual` field rules above.
5. **Draft handling.** `published: false` builds a real page carrying `<meta name="robots" content="noindex,nofollow">`, and is excluded from `sitemap.xml`, `rss.xml`, the `/rust` module map, prev/next chains, and every index. It is reachable only by typing its URL — which is the point: drafts must be reviewable from a phone during leave.
6. **Numerals.** A lint pass rejects Eastern Arabic-Indic digits (U+0660–U+0669) anywhere in `content/`.
7. **Code block direction.** Every fenced block compiles to a `dir="ltr"` container; a lesson cannot opt out.

---

## 5. Component APIs

### 5.1 `MemoryStepper` — the schema, fixed before any component code

This section is the one that has to be right. Seven visuals depend on it, and a change discovered at lesson 2.4 costs a rewrite of everything authored before it, during a period that may have no laptop.

The types in `docs/VISUALS.md` §3.1 are superseded. They could not express frames, note text, slice windows, conflicts, or multi-line highlight.

```ts
// components/visuals/MemoryStepper/types.ts
// Imported by every content/**/*.steps.ts, so authoring errors are type errors.

// ── top level ────────────────────────────────────────────────────
export type MemoryVisual = {
  id: string;
  titleAr: string;
  /** One for most visuals. Lesson 2.4 uses two: legal and illegal. */
  sequences: Sequence[];
};

export type Sequence = {
  id: string;
  /** Tab label. Required when sequences.length > 1. */
  labelAr?: string;
  /** Rust source, LTR, highlighted by Shiki at build. */
  code: string;
  /** Stamped beside any `note.code` or `conflict.code` in this sequence. */
  rustcVersion: string;
  steps: Step[];
};

// ── a step ───────────────────────────────────────────────────────
export type Step = {
  /** Was `codeLine: number`. Steps 2 and 3 of lesson 2.2 both sit on line 2. */
  highlight: LineRange;
  /** Arabic, 1–3 sentences. This is the text alternative for the whole diagram. */
  explanation: string;
  /** Ordered, outermost first. MAY be empty — an empty frame still renders. */
  frames: Frame[];
  heap: HeapBlock[];
  /** String literals and consts. Only present when the lesson is about them. */
  statics?: StaticBlock[];
  /** Explicit edges. Plain pointers are derived from `pointsTo` and need no entry. */
  links?: Link[];
  note?: Note;
  conflict?: Conflict;
};

export type LineRange = number | number[] | { from: number; to: number };

// ── stack ────────────────────────────────────────────────────────
export type Frame = {
  id: string;
  fn: string;                       // 'main', 'calculate_length'
  slots: StackSlot[];               // may be []
  state?: 'active' | 'parent' | 'returning';
};

export type StackSlot = {
  id: string;
  name: string;                     // 's1'
  state: SlotState;
  /** Defaults: 'fields' if `fields`, 'layout' if `cells`, else 'inline'. */
  render?: 'inline' | 'fields' | 'layout';
  value?: string;                   // render 'inline'  → 5
  fields?: Field[];                 // render 'fields'  → ptr / len / cap
  cells?: Cell[];                   // render 'layout'  → byte layout with padding
  pointsTo?: PointerTarget;
  /** THIS slot borrows FROM the named owners. Arrow is drawn borrower → owner. */
  borrows?: Borrow[];
  /** Rendered beside an owner slot in lesson 2.3. */
  borrowCounter?: { shared: number; mut: number };
  typeName?: string;                // 'String', '&str' — small, LTR
  bytes?: number;                   // total size, shown when size is the lesson
};

export type SlotState =
  | 'owned' | 'borrowed' | 'borrowed_mut'
  | 'moved' | 'dropped' | 'uninitialised';

export type Field = {
  label: string;
  value: string;
  /** Draws the change emphasis for this step only. */
  changed?: boolean;
};

export type PointerTarget =
  | string                                        // the whole block
  | { block: string; from: number; to: number };  // a window into it (lesson 2.5)

export type Borrow = { owner: string; kind: 'shared' | 'mut'; label?: string };

// ── heap ─────────────────────────────────────────────────────────
export type HeapBlock = {
  id: string;
  cells: Cell[];
  /** ≥ cells.length. The surplus renders as empty spare slots (lesson 5.1). */
  capacity?: number;
  state: 'alive' | 'freed';
  label?: string;                   // 'String data' — LTR
  bytes?: number;
  /** Reallocation provenance; draws the copy arrow in lesson 5.1. */
  copiedFrom?: string;
};

export type Cell = string | {
  text?: string;
  kind?: 'value' | 'padding' | 'uninit' | 'spare';
  offset?: number;                  // byte offset, shown when bytes are the lesson
};

export type StaticBlock = { id: string; label: string; cells: Cell[] };

// ── annotations ──────────────────────────────────────────────────
export type Link = {
  from: string;                     // slot or block id
  to: string;
  kind: 'pointer' | 'borrow' | 'borrow_mut' | 'invalid';
  label?: string;
};

export type Note = {
  kind: 'insight' | 'error' | 'warning';
  text: string;                     // Arabic
  /** Verbatim compiler output. Rendered dir="ltr" with the sequence's rustcVersion. */
  code?: string;
};

export type Conflict = {
  slots: string[];                  // rendered in the error colour with an ✕ badge
  message: string;                  // Arabic
  code?: string;                    // verbatim compiler error
};
```

### 5.2 Proof sketches — the schema against all seven visuals

Per the ruling, the format is proven against every planned memory visual before component code exists.

**2.1 الستاك والهيب** — needs an inline scalar next to a three-field `String`.

```ts
{ highlight: 3, explanation: 'دلوقتي عندنا نوعين مختلفين تماماً في الذاكرة…',
  frames: [{ id: 'f0', fn: 'main', state: 'active', slots: [
    { id: 'x', name: 'x', typeName: 'i32', state: 'owned', value: '5', bytes: 4 },
    { id: 's', name: 's', typeName: 'String', state: 'owned', pointsTo: 'h1',
      fields: [{ label: 'ptr', value: '0x5f2a' },
               { label: 'len', value: '2' },
               { label: 'cap', value: '2' }] },
  ]}],
  heap: [{ id: 'h1', cells: ['h', 'i'], capacity: 2, state: 'alive', label: 'String data' }],
  note: { kind: 'insight', text: 'x قيمته جوّه الستاك نفسه. s قيمته على الهيب…' } }
```
✔ inline vs fields, pointer, insight note.

**2.2 الملكية والنقل** — the flagship. Step 1 is *"empty `main` frame"*, which the old type could not represent at all.

```ts
// step 1 — the frame exists and is empty
{ highlight: 1, explanation: 'البرنامج بدأ. الـ frame بتاع main اتفتح وهو فاضي.',
  frames: [{ id: 'f0', fn: 'main', slots: [], state: 'active' }], heap: [] }

// step 4 — the move
{ highlight: 3, explanation: 'النقل حصل هنا…',
  frames: [{ id: 'f0', fn: 'main', state: 'active', slots: [
    { id: 's1', name: 's1', typeName: 'String', state: 'moved',
      fields: [{ label: 'ptr', value: '0x5f2a' },
               { label: 'len', value: '5' }, { label: 'cap', value: '5' }] },
    { id: 's2', name: 's2', typeName: 'String', state: 'owned', pointsTo: 'h1',
      fields: [{ label: 'ptr', value: '0x5f2a', changed: true },
               { label: 'len', value: '5', changed: true },
               { label: 'cap', value: '5', changed: true }] },
  ]}],
  heap: [{ id: 'h1', cells: ['h','e','l','l','o'], capacity: 5, state: 'alive' }] }
```
`s1` is `moved` **and carries no `pointsTo`** — so no arrow leaves an invalid binding. That falls out of the schema rather than needing a rule.

Step 6 carries the real error. Captured from a real run, per `CLAUDE.md`:

```ts
note: { kind: 'error',
  text: 'لو جربت تستخدم s1 دلوقتي، الكومبايلر هيرفض:',
  code: 'error[E0382]: borrow of moved value: `s1`\n' +
        '  |\n' +
        '3 |     let s2 = s1;\n' +
        '  |              -- value moved here\n' +
        '4 |     println!("{}", s1);\n' +
        '  |                    ^^ value borrowed here after move' }
// Sequence.rustcVersion: '1.97.1' — verified output, rustc 1.97.1 (8bab26f4f 2026-07-14)
```

**2.3 الاستعارة** — a second frame, and the borrow counter.

```ts
frames: [
  { id: 'f0', fn: 'main', state: 'parent', slots: [
    { id: 's', name: 's', typeName: 'String', state: 'borrowed', pointsTo: 'h1',
      borrowCounter: { shared: 1, mut: 0 },
      fields: [{ label: 'ptr', value: '0x5f2a' }, { label: 'len', value: '5' },
               { label: 'cap', value: '5' }] }]},
  { id: 'f1', fn: 'calculate_length', state: 'active', slots: [
    { id: 'r', name: 's', typeName: '&String', state: 'owned',
      borrows: [{ owner: 's', kind: 'shared' }],
      fields: [{ label: 'ptr', value: '→ main::s' }] }]},
]
```
✔ Frame order carries the call stack. `borrows` sits on the **borrower** naming the **owner**, matching the arrow direction in `VISUALS.md` §2.3 — the old `{ from }` was ambiguous. The borrower owns nothing and frees nothing, which the renderer enforces: a slot with `borrows` never draws a free.

**2.4 الاستعارة القابلة للتغيير** — two sequences, and a conflict.

```ts
sequences: [
  { id: 'legal',   labelAr: 'مسموح',  code: /* … */, rustcVersion: '1.97.1', steps: [/* … */] },
  { id: 'illegal', labelAr: 'ممنوع',  code: /* … */, rustcVersion: '1.97.1', steps: [
    { highlight: { from: 4, to: 5 }, explanation: 'الاتنين مع بعض ممنوع…',
      frames: [/* r1 borrowed, r2 borrowed_mut */], heap: [/* … */],
      conflict: { slots: ['r1', 'r2'],
                  message: 'ما ينفعش استعارة قابلة للتغيير مع استعارة عادية…',
                  code: '<captured from a real run at authoring time>' } }]},
]
```
✔ Multi-sequence and multi-line highlight. **The `sequences` array exists in the schema from day one but the tab UI is period-2 work** — no launch visual needs it, and adding the field later would have been the schema change we are avoiding.

**2.5 الشرائح** — the whole lesson is "a slice allocates nothing".

```ts
frames: [{ id: 'f0', fn: 'main', state: 'active', slots: [
  { id: 's', name: 's', typeName: 'String', state: 'borrowed', pointsTo: 'h1',
    fields: [{ label: 'ptr', value: '0x5f2a' }, { label: 'len', value: '11' },
             { label: 'cap', value: '11' }] },
  { id: 'w', name: 'hello', typeName: '&str', state: 'owned',
    borrows: [{ owner: 's', kind: 'shared' }],
    pointsTo: { block: 'h1', from: 0, to: 5 },        // ← the window
    fields: [{ label: 'ptr', value: '0x5f2a' }, { label: 'len', value: '5' }] },
]}],
heap: [{ id: 'h1', cells: [...'hello world'], capacity: 11, state: 'alive' }]
```
✔ The windowed `PointerTarget` renders as a bracket spanning cells 0–5 of an existing block. **No second heap block appears** — which is exactly the point the lesson makes.

**5.1 المجموعات** — `Vec` reallocation.

```ts
heap: [
  { id: 'h1', cells: ['1','2'],          capacity: 2, state: 'freed' },
  { id: 'h2', cells: ['1','2','3'],      capacity: 4, state: 'alive', copiedFrom: 'h1' },
]
```
✔ `capacity` > `cells.length` draws one spare slot; `copiedFrom` draws the copy arrow; the old block sits `freed` beside the live one, which is what makes "your held pointer is now invalid" visible.

**3.1 الـ Structs** — field layout with padding.

```ts
{ id: 'p', name: 'p', typeName: 'Point', state: 'owned', render: 'layout', bytes: 8,
  cells: [
    { text: 'x: u8',  kind: 'value',   offset: 0 },
    { text: '',       kind: 'padding', offset: 1 },
    { text: '',       kind: 'padding', offset: 2 },
    { text: '',       kind: 'padding', offset: 3 },
    { text: 'y: u32', kind: 'value',   offset: 4 },
  ]}
```
✔ `render: 'layout'` with `Cell.kind: 'padding'`. Note `docs/VISUALS.md` §4 currently specifies 3.1 as a **static SVG**, while `CLAUDE.md`'s component table lists struct layout under `MemoryStepper`. The schema supports either, so that choice can be made when 3.1 is written without reopening the format. Flagged in §10.

**Conclusion: the format expresses all seven.** The additions over the draft type — first-class frames, note/conflict text, windowed pointers, `render: 'layout'`, `capacity`, `copiedFrom`, multi-line highlight, and explicit borrow direction — are each demanded by a specific named visual, and nothing is speculative.

### 5.3 `MemoryStepper` — props, state, behaviour

```ts
type MemoryStepperProps = {
  visual: MemoryVisual;
  /** 0-based. Deep links land on a step: /rust/ownership/move/#step-4 */
  initialStep?: number;
};
```

State — three values, nothing else:

```ts
{ sequenceIndex: number;   // always 0 at launch
  stepIndex: number;
  isReducedMotion: boolean }  // from matchMedia, live-updating
```

Everything else derives: the current `Step`, whether prev/next are enabled, the counter text.

| Concern | Decision |
|---|---|
| Direction | Code panel and memory panel `dir="ltr"`. Explanation, controls, notes `dir="rtl"`. The boundary is a hard rule, tested at 380px. |
| Keyboard | **`ArrowLeft` = next, `ArrowRight` = previous.** Arrows follow *visual* direction, and in RTL the next control sits on the left. Getting this backwards is the classic RTL bug. `Home`/`End` jump to first/last. |
| Touch | Horizontal swipe, same visual-direction mapping. ≥44px targets, controls pinned to the component's bottom edge on mobile. |
| Layout | Desktop: code ∥ memory, explanation below, controls below. ≤640px: code → memory → explanation → controls, stacked. |
| Motion | CSS transitions on `x`, `y`, `opacity`, `stroke-dasharray`, ~250ms. `prefers-reduced-motion` disables transitions and **keeps stepping working**. |
| Accessibility | The SVG is `aria-hidden`; `explanation` is the text alternative in an `aria-live="polite"` region. `role="group"` with an Arabic `aria-roledescription`. Counter announced as `الخطوة 3 / 7`. |
| Numerals | Western, always. |
| Autoplay | None. The learner sets the pace. |

### 5.4 The other three

`FlowDiagram` (period 3) — `{ input, branches: { pattern, taken, result }[] }` plus an interactive variant where the learner edits `input` and the matching arm highlights. State: `{ inputValue }`.

`LifetimeTimeline` (period 3) — `{ name, start, end, kind: 'owner' | 'borrow' }[]` plus `violations: { at: number, message: string }[]`. A dangling borrow renders its bar extending past its owner's end, in the error colour. Stateless.

**Static SVG** — hand-authored, inlined, no props, no JS. Everything that does not change state. Launch: 0.4 project tree, 1.1 shadowing vs mutation, 1.2 integer ranges, 1.3 expression vs statement.

These two component APIs are sketched, not fixed. Unlike `MemoryStepper`, neither is on the critical path and neither has seven downstream visuals depending on its stability.

---

## 6. Design tokens

Every ratio below is computed, not asserted — `scripts/contrast.ts` reproduces them and is re-run whenever a token changes. Dark is the default; light is the toggle.

### Colour — dark (default)

```css
:root {
  --bg:            #0D1117;
  --surface:       #161B22;
  --surface-2:     #1C2128;
  --border:        #30363D;   /* decorative rules */
  --border-strong: #6E7681;   /* region outlines — must stay legible */
  --text:          #E6EDF3;
  --text-muted:    #9198A1;
  --accent:        #2DD4BF;

  --mem-owned:        #2DD4BF;   /* = accent, per VISUALS §2.2 */
  --mem-borrowed:     #60A5FA;
  --mem-borrowed-mut: #FBBF24;
  --mem-moved:        #8B949E;
  --mem-freed:        #7D8590;
  --mem-error:        #FF7B72;
  --mem-pointer:      #C9D1D9;
  --mem-stack-bg:     #161B22;
  --mem-heap-bg:      #1C2128;
  --mem-static-bg:    #12171E;
  --mem-tint:         0.14;      /* state colour alpha over panel bg */
}
```

### Colour — light

```css
[data-theme='light'] {
  --bg:            #FFFFFF;
  --surface:       #F6F8FA;
  --surface-2:     #EAEEF2;
  --border:        #D0D7DE;
  --border-strong: #7D8590;
  --text:          #1F2328;
  --text-muted:    #59636E;
  --accent:        #0F766E;

  --mem-owned:        #0F766E;
  --mem-borrowed:     #1D4ED8;
  --mem-borrowed-mut: #B45309;
  --mem-moved:        #6E7781;
  --mem-freed:        #737D8A;
  --mem-error:        #CF222E;
  --mem-pointer:      #424A53;
  --mem-stack-bg:     #F6F8FA;
  --mem-heap-bg:      #EAEEF2;
  --mem-static-bg:    #EEF1F4;
  --mem-tint:         0.12;
}
```

The accent is cool — teal — because the warm end of the spectrum is reserved entirely for memory semantics. Rust orange would have collided with `--mem-borrowed-mut`.

### Measured contrast

Text, AA needs 4.50:

| | dark | light |
|---|---|---|
| `--text` on `--bg` | 16.02 | 15.80 |
| `--text` on `--surface` | 14.64 | 14.84 |
| `--text-muted` on `--bg` | 6.50 | 6.11 |
| `--accent` on `--bg` | 10.17 | 5.47 |

Memory state borders against their panel, WCAG 1.4.11 needs 3.00 — worst case per state, across both stack and heap panels:

| State | dark | light |
|---|---|---|
| `owned` | 8.69 | 4.69 |
| `borrowed` | 6.37 | 5.75 |
| `borrowed_mut` | 9.69 | 4.31 |
| `moved` | 5.26 | 3.90 |
| `freed` | 4.34 | 3.58 |
| `error` | 6.42 | 4.59 |
| `pointer` arrow on `--bg` | 12.26 | 8.99 |
| `--border-strong` region outline | 3.77 | 3.50 |

All pass. Slot label text (`--text` over a state-tinted fill) ranges 10.86–13.52 dark and 12.25–13.32 light; all pass 4.50.

**The honest caveat.** State colours are deliberately close in *luminance* so no state shouts louder than another — `borrowed` vs `error` is 1.01:1 in dark, `owned` vs `error` is 1.02:1 in light. Two colours at equal luminance are indistinguishable to a viewer with the corresponding colour-vision deficiency. **This is why `VISUALS.md` §2.2 requires that colour is never the only signal**, and why that rule is enforceable only if every state also differs structurally:

| State | Border | Fill | Extra |
|---|---|---|---|
| `owned` | solid, 2px | tinted | — |
| `borrowed` | solid, 1.5px | tinted | dashed arrow in |
| `borrowed_mut` | solid, 3px | tinted | thick solid arrow in |
| `moved` | **dashed** | diagonal hatch, 40% opacity | — |
| `dropped` | fades, then removed | — | — |
| `freed` | **dotted** | none | 50% opacity |
| `uninitialised` | **dotted** | none | — |
| conflict | solid | tinted | **✕ badge** |

`freed` and `uninitialised` share a treatment but never co-occur — `freed` is a heap block, `uninitialised` is a stack slot, and they live in different panels.

Shape carries the region: **stack slots are sharp rectangles, heap blocks are rounded**, per `VISUALS.md` §2.1.

### Typography

```css
--font-sans: 'IBM Plex Sans Arabic', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

IBM Plex Sans Arabic at 400 / 500 / 600, JetBrains Mono at 400 / 700. Self-hosted WOFF2 in `public/fonts`, `font-display: swap`, preloaded, served immutable via `_headers`. **`font-variant-ligatures: none` on every code surface** — `->` must render as the two characters a learner types.

Type scale, 1.200 minor third, `rem`-based:

| Token | Size | Line height |
|---|---|---|
| `--fs-xs` | 0.833rem | 1.6 |
| `--fs-sm` | 0.9rem | 1.7 |
| `--fs-base` | 1rem | **1.85** |
| `--fs-lg` | 1.2rem | 1.6 |
| `--fs-xl` | 1.44rem | 1.4 |
| `--fs-2xl` | 1.728rem | 1.3 |
| `--fs-3xl` | 2.074rem | 1.2 |
| `--fs-code` | 0.9rem | 1.65 |

Body line-height is 1.85, above the ≥1.8 floor in `SITE_SPEC.md` §5 — Arabic reads badly tight, and this site is mostly body text. Measure capped at `68ch` for Arabic prose.

### Spacing, radii, motion

```css
--sp-1: 0.25rem;  --sp-2: 0.5rem;   --sp-3: 0.75rem;  --sp-4: 1rem;
--sp-5: 1.5rem;   --sp-6: 2rem;     --sp-7: 3rem;     --sp-8: 4rem;

--radius-stack: 2px;    /* sharp — stack slots */
--radius-heap:  8px;    /* rounded — heap blocks */
--radius-ui:    6px;

--dur-step: 250ms;
--ease:     cubic-bezier(0.4, 0, 0.2, 1);
--tap-min:  44px;
```

`@media (prefers-reduced-motion: reduce)` sets `--dur-step: 0ms`. Stepping still works.

All spacing is applied through logical properties — `margin-inline-start`, `padding-inline-end`, `inset-inline-start`. `margin-left` never appears in this codebase.

---

## 7. Build pipeline

Two pipelines, deliberately. **Cloudflare Pages runs the fast one. GitHub Actions runs the slow one.** A Pages build that takes five minutes or needs a browser is a Pages build that fails while you are away.

### Cloudflare Pages — build command `pnpm run build:ci`

| # | Step | Fails the build when |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | lockfile drift |
| 2 | `tsc --noEmit` | any type error, including in a `.steps.ts` |
| 3 | `scripts/validate-content.ts` | frontmatter invalid · slug changed after publication · dangling cross-reference · missing visual target · Eastern-Arabic digits in `content/` |
| 4 | `scripts/fetch-asm.ts --verify-only` | **any `showAsm` block has no cache entry.** In CI this never calls the network — a miss is an error telling you to run the fetch locally and commit the result. |
| 5 | `next build` → `out/` | anything |
| 6 | `scripts/build-feeds.ts` | emits `sitemap.xml`, `robots.txt`, `rss.xml`; drafts, `noindex` pages and `/admin` excluded |
| 7 | `scripts/check-links.ts` | **a broken internal link.** External links warn only — no network in CI, and a dead external link is not worth a failed deploy. |
| 8 | `scripts/check-budget.ts` | any route exceeds its JS budget |

Step 4 is the load-bearing one. Compiler Explorer is **never** called from a Cloudflare build: the cache is a committed artefact, and CI only verifies it is complete.

### Local, author-run — `pnpm run asm:fetch`

For each `showAsm` block:

1. Hash `{ source, compilerId, options }` → `cache/asm/<hash>.json`.
2. If present, stop. Never re-fetch.
3. `POST https://godbolt.org/api/compiler/<pinned-id>/compile` with `options=-C opt-level=2`, `filters=labels,directives,comments`, `Accept: application/json`.
4. `POST /api/shortener` once for the "افتح في Compiler Explorer ↗" link.
5. Write `{ hash, compilerId, rustcVersion, asm, sourceMap, shortLink, fetchedAt }`, commit it.

`asm[].source.line` is the source↔assembly mapping that makes the custom responsive view possible. **Assembly is out of launch scope** — no launch lesson uses it — but the script is built now, while a laptop exists, per the ruling.

### GitHub Actions — on push and PR

`tsc --noEmit` · `vitest run` · **`playwright test` including the 380px mixed-direction check** · `check-budget`. Playwright stays out of the Pages build: it needs a browser download and would make every deploy slow and fragile.

### Byte budget

`scripts/check-budget.ts` parses each emitted HTML file for `<script src>`, sums the gzipped size of the referenced chunks, and compares against a per-route ceiling.

Honest caveat: **Next.js App Router ships a React/Next client runtime on every page — there is no supported way to emit a truly zero-JS page.** The budget therefore measures *what we add on top of that baseline*, which is the thing we actually control:

| Route class | Budget |
|---|---|
| Framework baseline | measured at Prompt 1, then frozen as the reference |
| Prose lesson (no visual) | baseline + 2 KB gzip (theme script, analytics beacon, Giscus loader) |
| Lesson with `MemoryStepper` | baseline + 12 KB gzip |
| `/admin` | baseline + 4 KB gzip |

The numbers are provisional until Prompt 1 measures the baseline. See §9 R-9 and §10 Q-6 — the baseline is large enough that it deserves a look before it is locked in.

### `SITE_URL`

One constant in `lib/site.ts`, consumed by canonicals, `sitemap.xml`, `rss.xml`, `robots.txt`, and the OG card. Until the domain lands it holds a placeholder; changing it is a one-line commit.

---

## 8. Task breakdown

> **`docs/PROMPTS.md` was not present when this was written.** The grouping below is inferred from the two things stated directly — that this is Prompt 0, and that Prompt 1 succeeds on exactly the deploy and the 380px render — plus the leave-period order in `SITE_SPEC.md` §10. **Reconcile against the real `PROMPTS.md` before starting P1.**

Critical path marked ⚡. Everything not on it can slip a task without endangering the launch.

### P0 — Plan and spec correction *(this task; complete)*

| | Task | Depends on |
|---|---|---|
| ⚡ | `git init`, commit specs as received | — |
| ⚡ | Rename Fikra → Maarefa across all files | — |
| ⚡ | Apply E1–E5 and C1–C6 corrections to `CLAUDE.md` and `docs/` | — |
| ⚡ | Write `PLAN.md` | above |

### P1 — Scaffold and deploy ⚡

**Succeeds on exactly two things: live on the real domain, and correct at 380px.** Nothing else in this prompt matters by comparison.

| | Task | Depends on |
|---|---|---|
| ⚡ | Next 16.3.0 + React 19.2.8 + TS 7.0.2, `output: 'export'` | — |
| ⚡ | `styles/tokens.css` — the full §6 set, both themes | — |
| ⚡ | Font subsetting, WOFF2 committed, `_headers` cache rules | — |
| ⚡ | `app/layout.tsx` — `lang="ar" dir="rtl"`, inline anti-FOUC theme script | tokens, fonts |
| ⚡ | RTL base CSS: logical properties, `dir="ltr"` code containers, bidi isolation | layout |
| ⚡ | **Playwright 380px mixed-direction harness** | layout |
| ⚡ | One real lesson page, mixed Arabic + English identifiers, verified at 380px | above |
| ⚡ | Cloudflare Pages project, `.node-version`, domain live | export builds |
| | `check-budget.ts` + baseline measurement | export builds |
| | 404, `robots.txt` | layout |

### P2 — Content pipeline ⚡

| | Task | Depends on |
|---|---|---|
| ⚡ | `lib/schema.ts` — zod schemas from §4 | P1 |
| ⚡ | `lib/content.ts` — read, validate, sort, prev/next | schema |
| ⚡ | `lib/mdx.ts` — `@mdx-js/mdx` + remark/rehype + Shiki, custom theme | P1 |
| ⚡ | `CodeBlock` with the three tiers; `dir="ltr"`, ligatures off | mdx |
| ⚡ | `/rust/[module]/[lesson]` route + `generateStaticParams` | content, mdx |
| ⚡ | Slug registry + the never-regenerate check | schema |
| | `LessonLayout` — the seven-part template, `Exercise` via `<details>` | route |
| | `ModuleProgress`, `PrevNext` | content |
| | `validate-content.ts` wired into `build:ci` | schema |

### P3 — `MemoryStepper` ⚡ *the long pole*

| | Task | Depends on |
|---|---|---|
| ⚡ | `types.ts` — §5.1 verbatim | P2 |
| ⚡ | SVG renderer: frames, slots, heap blocks, states | types |
| ⚡ | Connections: pointer, borrow, window, invalid | renderer |
| ⚡ | Controls: RTL, **`ArrowLeft` = next**, swipe, ≥44px | renderer |
| ⚡ | **380px mixed-direction Playwright case** | controls |
| ⚡ | Transitions + `prefers-reduced-motion` | renderer |
| ⚡ | `aria-live` explanation, `aria-hidden` SVG, keyboard | controls |
| | `render: 'layout'`, `capacity`, `copiedFrom`, `sequences` tabs | renderer *(period 2 — no launch visual needs them)* |

### P4 — Launch content ⚡

Nine lessons, all new writing. Every code sample compiles; every quoted error is verbatim with its rustc version.

| | Task | Depends on |
|---|---|---|
| ⚡ | 2.1 الستاك والهيب + `.steps.ts` | P3 |
| ⚡ | 2.2 الملكية والنقل + `.steps.ts` — **the flagship** | P3 |
| ⚡ | 0.1–0.4 (module 0) + static SVG for 0.4 | P2 |
| ⚡ | 1.1–1.3 + static SVGs | P2 |
| ⚡ | Five problem pages | P2 |
| | `/rust` track overview, modules 3–5 shown as قادم قريباً | P2 |

Budget more time on 2.2 than on any other single artifact. It is the reason someone shares the link.

### P5 — Community and admin

| | Task | Depends on |
|---|---|---|
| | Giscus, lazily mounted, per-lesson mapping | P2 |
| | `/discuss` + pinned reply-schedule notice | Giscus |
| | GitHub issue template for problem submissions | repo |
| | `/admin` §6.1 build-time inventory | P2 |
| | `/admin` §6.2 issue queue (unauthenticated REST) + Cloudflare Access | admin page |

### P6 — Ship

| | Task | Depends on |
|---|---|---|
| ⚡ | `build-feeds.ts` — sitemap, robots, RSS | P4 |
| ⚡ | `check-links.ts` — internal fails the build | P4 |
| ⚡ | Search Console verified, Cloudflare Web Analytics on | domain live |
| | `/about` with real name and background | — |
| | One static OG card | — |
| | Print stylesheet | tokens |
| | LICENSE + LICENSE-CONTENT + README | — |
| | LinkedIn announcement | site live |

### P7 — Period 2 (not launch)

1.4 + its static SVG · lessons 2.3–2.5 · `sequences` tab UI · five more problems · inline Playground execution · first `showAsm` lesson end-to-end · per-lesson OG cards.

**If the window tightens, cut in this order:** per-lesson OG → print stylesheet → RSS → `/about` polish → the admin inventory panel. Keep the deploy and keep 380px correct.

---

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R-1** | **RTL/LTR mixing inside `MemoryStepper`.** One component holds four direction boundaries — LTR code, LTR memory, RTL explanation, RTL controls. Bidi bugs are silent: nothing throws, the layout just reverses. The classic failure is arrow keys mapped to logical rather than visual direction. | Direction set explicitly on every panel, never inherited. `ArrowLeft` = next, fixed in §5.3 and asserted in a Playwright case. Each boundary gets its own test. A `dir` audit runs in CI: any `.module.css` containing `margin-left`, `padding-right`, `left:` or `right:` fails. |
| **R-2** | **380px layout.** The stepper wants two panels side by side; at 380px they must stack without the SVG overflowing, and controls must stay ≥44px and reachable. Most likely to break when a heap block grows to 11 cells (lesson 2.5). | 380px is a first-class Playwright project running on every push, not a manual check. The stepper's worst case — the widest heap block in any authored visual — is a fixture in that suite. SVG `viewBox` scales; the memory panel scrolls horizontally inside its own container rather than widening the page. |
| **R-3** | **Compiler Explorer availability.** A donation-funded free service. If it is down, slow, changes its API, or renames a compiler ID, an uncached fetch fails. | The build **never** calls it. Cache is committed; CI runs `--verify-only` and fails on a miss rather than reaching the network. Fetching is a deliberate local act. Compiler ID pinned in config, so a rename fails loudly at fetch time — with a laptop present — rather than silently changing published output. Assembly is out of launch scope entirely, so this cannot affect the launch. |
| **R-4** | **`MemoryStepper` schema churn.** The failure this plan exists to prevent: a gap found at 2.4 invalidates every `.steps.ts` written before it, possibly during leave. | §5.2 proves the format against all seven planned visuals before component code exists. `types.ts` is imported by every `.steps.ts`, so a schema change surfaces as type errors at every call site rather than as silently wrong diagrams. |
| **R-5** | **Arabic font subsetting breaks shaping.** Arabic requires contextual forms and mark positioning. Naive codepoint-range subsetting drops `init`/`medi`/`fina`/`isol`, `mark`, `mkmk` and `rlig`, and the result renders as disconnected letters — often only in some words, so a casual look passes. | Subset with `pyftsubset` retaining those layout features explicitly. Run once, commit the WOFF2, document the exact command in the README — no Python in the build. A Playwright screenshot of a known Arabic pangram is part of the 380px suite, so a broken subset fails CI rather than shipping. |
| **R-6** | **rustc error text drifts.** Wording changes between releases. Quoted errors are the SEO asset and the pedagogical payload; a stale quote is worse than none. | Version pinned and **displayed** beside every quoted error and assembly panel. `rustcVersion` is a required frontmatter field wherever compiler output appears. A periodic review task, not a build check — the site should show what a real compiler said, with the version attached. |
| **R-7** | **A Cloudflare Pages build fails while you are away.** Site stops updating; you cannot debug from a phone. | Everything that can fail runs in GitHub Actions on push *before* Pages builds, so the failure arrives as a phone notification against a commit rather than as a silent stale site. The Pages build itself is only install → typecheck → validate → export → feeds → links → budget: no network, no browser. The last good deploy stays live. |
| **R-8** | **Slug drift.** A renamed slug after indexing destroys the SEO asset. | `content/.slug-registry.json`, append-only, checked in `validate-content.ts`. Changing a published slug fails the build. |
| **R-9** | **The "zero JS" goal is not reachable with Next App Router.** Next ships a React/Next client runtime on every page. `SITE_SPEC.md`'s "per-page islands, zero JS on prose pages" describes an architecture Next does not offer. | Budget measures what we add above the baseline, and all lesson content stays in Server Components so no *component* JS is added. The baseline is real and should be seen before it is locked — §10 Q-6. |
| **R-10** | **Scope creep from small items.** Print stylesheet, RSS, 404, OG card, Playwright setup are each an hour and together are a launch window. | §8 P6 lists an explicit cut order. Launch succeeds on the deploy and 380px; everything else is negotiable. |
| **R-11** | **TypeScript 7 is new.** The native compiler is a rewrite; a Next 16 or type-definition incompatibility would surface mid-build. | Isolated to tooling — nothing ships. Fallback is `typescript@5.9.x`, a one-line change with no code impact. Verify at P1 before content exists. |
| **R-12** | **Giscus depends on GitHub.** An outage or a Discussions policy change takes comments with it. | Lazily mounted and non-blocking: the lesson renders fully without it. No lesson content lives in a comment thread. |

---

## 10. Open questions

Blocking items first.

| # | Question | Blocks |
|---|---|---|
| **Q-1** | **`docs/PROMPTS.md` never arrived.** The answers said it exists and is being added; `docs/` contains only the three original specs. I did not invent one — §8 is grouped provisionally from the stated Prompt 0 / Prompt 1 facts plus `SITE_SPEC.md` §10. There is a `PROMPTS.md` in `~/Downloads` dated 2026-08-10, but it is the `tansiq_misr` project's file — a different project — so I did not use it. | §8, and starting P1 |
| **Q-2** | **The domain.** The answers referred to "the note supplied with this answer"; no note or domain arrived. `lib/site.ts` holds a placeholder as instructed, so nothing else depends on it — but `sitemap.xml`, canonicals, the Cloudflare Access application and Search Console verification all need the real value before P6. | P1 deploy, P6 |
| **Q-3** | **The corrected doc copies never arrived.** The answers said corrected `CLAUDE.md`, `PROMPTS.md` and `docs/` copies were supplied alongside. Files were untouched, so I applied every enumerated correction by hand instead — commit `36ff310`, reviewable as a diff against `c590b2b`. **If your copies still exist, diff them against that commit;** where they differ, yours win. Changes I made: brand rename throughout · E1–E5 · C1–C6 · `/playground` removed from the IA · ✅ dropped from 1.1–1.3 and "three exist as drafts" corrected · 1.4 moved to period 2 in all three docs · §7.1 metric replaced · the Eastern-Arabic numerals in the `VISUALS.md` 2.2 step table (`٣ كلمات`, `٢٤ بايت`) corrected · doc versions bumped to SITE_SPEC v3 and CURRICULUM v4. | reconciliation |

Decisions I need before the task that depends on them.

| # | Question | Needed by |
|---|---|---|
| **Q-4** | **Palette approval.** §6 is proposed, with measured ratios. Every AA threshold passes in both themes. The judgement call is the caveat: state colours sit close in luminance by design, so structural differentiation carries colour-blind and print legibility. Approve, or adjust? | P1 |
| **Q-5** | **rustc pin.** Local is **1.97.1 (8bab26f4f, 2026-07-14)** — used to capture the verbatim E0382 text in §5.2. Standardise the site on 1.97.1, or track latest stable at authoring time? | P4 |
| **Q-6** | **The Next baseline, one look before it is locked.** `SITE_SPEC.md` describes per-page islands and zero JS on prose pages — literally Astro's model. Next App Router ships its client runtime on every page regardless. Everything else in this plan is framework-agnostic, so this is cheapest to revisit at P1 and expensive after P4. I am proceeding with Next as `CLAUDE.md` mandates; I am flagging it once, with the number, rather than discovering it at lesson nine. | P1 |
| **Q-7** | **Giscus configuration** — repo owner, `repoId`, `categoryId`, and confirmation the giscus app is installed. Mapping will be `pathname`. | P5 |
| **Q-8** | **Cloudflare account and Access.** Is the domain on Cloudflare DNS, and is Zero Trust enabled for the `/admin` Access application? | P1, P5 |
| **Q-9** | **`/about` content** — real name, background, what you build. Cannot be drafted for you, and `CURRICULUM.md` §1 makes it the credibility mechanism. | P6 |
| **Q-10** | **Lesson 3.1's visual.** `VISUALS.md` §4 says static SVG; `CLAUDE.md`'s component table lists struct layout under `MemoryStepper`. The §5.1 schema supports both via `render: 'layout'`, so nothing is blocked — but the two documents should agree before module 3 is written. | period 3 |

---

*Nothing is built until this plan is reviewed and approved.*
