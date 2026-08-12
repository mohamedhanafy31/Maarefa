# CLAUDE.md — Fikra

Project context. Read fully before making any change.

**Fikra** · Arabic Technical Knowledge — *Learn what happens beneath the code.*

An Arabic-first learning platform for systems programming, launching with a Rust track. Its value is in three things that barely exist in Arabic: visual explanations of memory mechanics, generated assembly shown beside source, and a troubleshooting library written from real debugging.

Specifications live in `docs/`:
- `docs/SITE_SPEC.md` — architecture, admin page, analytics
- `docs/CURRICULUM.md` — brand, lesson list, launch scope
- `docs/VISUALS.md` — the visual system (read before building any visual)

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
- If a claim can't be verified, cut it rather than hedge it.

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
POST https://godbolt.org/api/compiler/<id>/compile
Body: source · Query: options,filters · Header: Accept: application/json
```

The response's `asm[].source.line` gives source-line ↔ assembly-line mapping, which is what makes the custom side-by-side view possible.

**Caching is mandatory.** Hash the code block, store the result under `cache/asm/`, commit it. Compiler Explorer is a donation-funded free service handling millions of compilations weekly — never re-fetch what is already cached, and never call it at runtime.

### Four components, not twenty-three visuals

The expensive mistake would be hand-building each visual. Build four components; author every visual as a typed data array.

| Component | Covers |
|---|---|
| `MemoryStepper` | all of module 2, Vec growth, struct layout — ~7 visuals |
| `LifetimeTimeline` | lifetimes |
| `FlowDiagram` | match, Option, Result, control flow |
| static SVG | everything that doesn't change state |

`MemoryStepper` is the critical piece. Get its data format right and every later memory visual is a data file, not a build task. **Read `docs/VISUALS.md` before touching it.**

---

## RTL — the detail that breaks Arabic technical sites

`dir="rtl"` on `<html>`, **but**:

- **Every code block, terminal output, file path, and error message must be `dir="ltr"`.** Without this, bidirectional reordering mangles code and makes error messages unreadable.
- Inline code inside Arabic prose: `dir="ltr"; unicode-bidi: isolate`
- Logical CSS properties only — `margin-inline-start`, never `margin-left`
- Western numerals (0-9) throughout — standard in Egyptian technical writing
- The `MemoryStepper` mixes directions inside one component: code and memory panels LTR, explanation and controls RTL. **Test this explicitly at 380px.**

Every page must be checked with mixed Arabic prose and English identifiers before it ships.

---

## Conventions

- **Arabic** for all learner-facing copy, Egyptian register, teaching voice — explain *why*, not just the rule
- **English** for code, identifiers, error messages, comments, commit messages, and file names. Never translate identifiers or error text.
- Slugs: Latin transliteration, stable, **never regenerated once published** — they get indexed
- **Zero JavaScript on prose-only pages.** Components are per-page islands.
- Syntax highlighting at build time (Shiki) — no highlighter shipped to the client
- No animation libraries. CSS transitions on SVG attributes are sufficient.
- All colours as CSS variables so dark mode and print are free
- `prefers-reduced-motion` disables transitions without disabling functionality

---

## Repository layout

```
docs/                         specifications — read, don't edit
content/
  rust/<module>/<lesson>.mdx
  rust/<module>/<lesson>.steps.ts    visual data, co-located
  problems/<slug>.mdx
cache/asm/<hash>.json         committed — never re-fetched
components/
  visuals/                    the four components
  lesson/                     lesson page parts
app/                          Next.js routes
scripts/                      build-time: asm fetch, sitemap, link check
```

`cache/` and `content/` are committed. Git history is the audit trail.

---

## Out of scope — do not build unprompted

CUDA track · paid product or paywall · user accounts · progress sync · notifications · comparison tools · a custom analytics dashboard · inline code execution (launch uses link-out only) · English translations

Each is planned for a later phase. Adding any now delays the critical path.

---

## Definition of done for a lesson

- [ ] Follows the seven-part template (see `docs/CURRICULUM.md` §4)
- [ ] Every code sample compiles — verified, not assumed
- [ ] Every quoted error message is verbatim from a real compiler run
- [ ] Visual present where the curriculum specifies one
- [ ] Renders correctly at 380px with mixed Arabic/English
- [ ] Code blocks are `dir="ltr"`
- [ ] Links to relevant `/problems` entries
- [ ] Prev/next navigation correct
- [ ] Zero console errors, zero JS if the lesson has no visual
