# Maarefa — Full Specification (v3)

*Arabic systems-programming learning platform.*

**v3 changes:** renamed from Fikra to Maarefa · corrected the rustc optimisation flag (§2.1) · dropped the admin Discussions panel, which was not buildable as specified (§6.2) · replaced return-visitor rate with the deep-lesson ratio (§7.1) · removed `/playground` (§3) · resolved the repo-privacy and inline-execution ambiguities.

Architecture, problems library, design, admin, and analytics.

**Companion documents — this file does not duplicate them:**
- `CURRICULUM.md` — brand, lesson list, launch scope, lesson template
- `VISUALS.md` — the visual system, component specs, per-lesson visual designs

---

## 1. What this is

An Arabic-first learning platform for systems programming, launching with a structured Rust track. Its differentiators are three things that barely exist in Arabic:

1. **Visual explanations of memory mechanics** — ownership, borrowing, stack/heap, shown step by step
2. **Generated assembly alongside source** — proving claims like "zero-cost abstraction" instead of asserting them
3. **A troubleshooting library written from real debugging**, keyed to the exact error strings people paste into search

**Hard constraint driving every decision:** the author is unavailable ~20 days per month with **no computer, phone only**. Nothing may require a laptop to keep running. Anything that rots unattended is delegated to a service or removed.

---

## 2. Architecture

```
Content        MDX in git
Build          Next.js static export
Host           Cloudflare Pages (free, unlimited bandwidth, commercial use OK)
Assembly       Compiler Explorer API, called at BUILD time, cached in git
Run code       play.rust-lang.org (link out only; inline deferred to period 2)
Community      GitHub Discussions via Giscus
Analytics      Cloudflare Web Analytics + Google Search Console
Admin gate     Cloudflare Access (free tier)
```

**No backend. No database. No server the author owns. No paid service except the domain.**

### 2.1 Why build-time assembly, not an iframe

Compiler Explorer's iframe is a full IDE with draggable panes. On a 380px screen it is unusable — and this site is mobile-first Arabic, where most learners are on phones. Full-state embed URLs also run 1500–2000 characters even for trivial examples.

Instead, call the REST API at build time:

```
POST https://godbolt.org/api/compiler/<pinned-compiler-id>/compile
Body:    source code
Query:   options=-C opt-level=2 & filters=labels,directives,comments
Header:  Accept: application/json
```

**The optimisation flag is `-C opt-level=2`, not `-O2`.** `-O2` is a GCC/Clang flag; rustc rejects it. The compiler ID is pinned in config to an explicit rustc version, never "latest" — otherwise cached assembly stops being reproducible and quoted output silently drifts from what the site claims. **Every assembly panel displays the rustc version it was produced with**, and the pinned version needs periodic review.

The response includes an `asm` array where each entry carries `text` and `source: {line}` — a **mapping from assembly line back to source line**. That mapping is what makes a custom side-by-side view possible: hover a Rust line, the corresponding assembly highlights.

| | Runtime iframe | Build-time API |
|---|---|---|
| Mobile | Unusable | Own responsive layout |
| Page weight | Heavy iframe | Pre-rendered HTML |
| CORS | Possible problem | Not applicable |
| If service is down | Page broken | Page fine |
| RTL / design system | Sealed inside iframe | Fully integrated |

**Caching is mandatory.** Hash each code block, store `{hash, asm, sourceMap}` under `cache/asm/`, commit to git. Rebuilds never re-hit the API. Compiler Explorer serves roughly 2.25 million compilations per week as a donation-funded free service — caching is basic courtesy, not an optimisation.

Every assembly panel gets an **"افتح في Compiler Explorer ↗"** link for learners who want to edit and experiment. Use the short-link API so the URL isn't 2000 characters.

### 2.2 Why Giscus for community

The requirement — users post problems, author replies, other users can reply — is user-generated content, which normally means a backend, accounts, spam filtering and moderation. Under a 20-day absence that becomes a spam graveyard.

GitHub Discussions via Giscus satisfies every part of the requirement while GitHub carries the operational burden: auth, spam, notifications, and **moderation from the GitHub mobile app**. The audience already has GitHub accounts.

Requires a **public repo** with Discussions enabled. **Decided: a single public repo, `maarefa`**, carrying content and discussions together. A split content/discussions pair was considered and rejected — two repos is two things to keep in sync from a phone.

**Pin a notice in Arabic** stating the reply schedule. Converting "abandoned site" into "known schedule" is worth more than any feature.

### 2.3 Code execution tiers, by purpose

Not every code block should be runnable. Marking everything makes the buttons noise.

| Block type | Tool | Used for |
|---|---|---|
| `plain` (default) | none | most examples |
| `runnable` | Rust Playground link, later inline | when **output** is the lesson |
| `showAsm` | build-time Godbolt render | when **generated code** is the lesson |

**Assembly is not useful in early lessons.** For a beginner learning `let mut x = 5`, assembly is noise, and under `-C opt-level=2` much of it disappears in ways that mislead. Modules 1–3 use plain and runnable blocks. Assembly appears from module 4 onward, where it proves something specific.

**No CUDA compiler at launch.** CUDA track is deferred entirely (see §11).

---

## 3. Information architecture

```
/                              landing
/rust                          track overview, module map, progress
/rust/[module]/[lesson]        lesson
/problems                      troubleshooting index
/problems/[slug]               one problem
/discuss                       community entry point: explainer, reply-schedule notice, link out
/about                         who wrote this, why, methodology
/admin                         private — see §6
```

`/playground` was specified here and has been **removed**. It would have been a thin page whose only content was a link, and lessons already link to the Playground at the point where the code actually appears. Thin pages damage the domain.

---

## 4. Problems library

**Authored by the site owner. Not user-generated.** `/problems` is curated; `/discuss` is community. Keeping these separate is what makes the section maintainable.

Format for every entry:

```
Symptom       verbatim error text, exactly as it appears
Cause         the mechanical reason
Fix           copy-pasteable steps
Why           the underlying model, so it generalises
Related       link to the lesson covering the concept
```

### Launch entries (all already solved and documented)

| Slug | Problem |
|---|---|
| `linux-binary-no-extension` | Where the executable actually is after `cargo build`; Linux ELF files have no extension |
| `rust-analyzer-not-working` | rust-analyzer does nothing — needs `Cargo.toml` at the VS Code workspace root |
| `cargo-command-not-found-vscode` | GUI-launched VS Code doesn't inherit `~/.cargo/bin`; launch with `code .` |
| `borrow-checker-first-errors` | The three most common borrow-checker error shapes, decoded |
| `string-vs-str-mismatch` | `String` vs `&str` type errors — why and how to read them |

**Verbatim error strings are the SEO asset.** People paste error messages into search, and Arabic competition for these queries is near zero.

Add a submission form ("واجهتك مشكلة؟") that opens a **GitHub issue template** — no backend, submissions accumulate during absence and become the next content batch. Label it as a content pipeline, not a support channel.

---

## 5. Design direction

- **Dark mode default**, light toggle. Matches the audience's editor.
- **Typography is the main lever.** Decided: **IBM Plex Sans Arabic** for Arabic and Latin prose, **JetBrains Mono with ligatures disabled** for code. Self-hosted WOFF2, subset, `font-display: swap`. Rubik was on the original shortlist and is disqualified — it ships no Arabic glyphs. Ligatures are off because `->` rendered as an arrow hides characters a beginner has to type.
- **Line-height ≥ 1.8 for Arabic body text.** Arabic reads badly tight.
- Restrained palette, one accent colour used deliberately.
- Code blocks are the visual anchor — custom syntax theme, not a default library skin.
- **No hero illustrations, no stock imagery, no gradient blobs.** The §6 visuals are the imagery.

### 5.1 RTL — the detail that breaks Arabic technical sites

`dir="rtl"` on `<html>`, **but**:

- Every code block, terminal output, file path, and error message must be `dir="ltr"`. Without this, bidi reordering mangles code and makes error messages unreadable. **This is the most common failure in Arabic technical sites.**
- Inline code inside Arabic prose needs `dir="ltr"; unicode-bidi: isolate`
- Logical CSS properties throughout (`margin-inline-start`, never `margin-left`)
- Western numerals (0-9) consistently — standard in Egyptian technical writing
- Test every page with mixed Arabic prose and English identifiers before shipping

---

## 6. Admin page

Route: `/admin`, `noindex`, unlinked, gated by **Cloudflare Access** (free tier, email OTP, zero code, works from a phone).

The admin page exists for what the external dashboards *cannot* show. It is **not** a rebuilt analytics dashboard — Cloudflare and Search Console already do that better, and both work on mobile.

### 6.1 Content inventory (static, generated at build)

| Panel | Shows |
|---|---|
| Lesson status | Every lesson: published / draft / not started |
| Visual coverage | Which lessons still lack their visual |
| Assembly cache | Which `showAsm` blocks are cached vs stale |
| Problems | Published count, drafts in progress |
| Broken links | Internal link check result from the build |

### 6.2 Live queues (client-side GitHub REST, public repo — no auth)

| Panel | Source |
|---|---|
| Problem submissions | Open issues with the `problem-report` label |
| Oldest unanswered | Sorted, so nothing sits forgotten |

**The unanswered-discussions panel was specified here and cannot be built as described.** GitHub Discussions is exposed only through the GraphQL API, and GraphQL requires a token unconditionally — there is no unauthenticated read path, so a static page cannot query it. Issues *are* readable unauthenticated over REST v3 (60 requests/hour/IP), so the `problem-report` queue is unaffected.

It is also unnecessary: the GitHub mobile app already pushes notifications for unanswered discussions, so the panel would duplicate a working channel while adding a moving part that fails silently during leave.

**Follow-on, not built now:** a scheduled GitHub Action querying GraphQL with `GITHUB_TOKEN` and committing a `discussions.json` snapshot, which triggers a Pages rebuild. Free and unattended, but a moving part — only add it if the notification channel proves insufficient in practice.

### 6.3 Traffic summary (phase 2, optional)

Cloudflare Web Analytics has a GraphQL API but requires a token, which cannot live in a static page. If a single combined view is wanted later, add **one Cloudflare Worker** (free tier, 100k requests/day) holding the token server-side and returning a small JSON summary.

**Do not build this at launch.** Check the Cloudflare and Search Console dashboards directly — both are mobile-friendly and free.

---

## 7. Analytics — what to measure and what it means

The audience is small: a few thousand Arabic-speaking developers interested in systems programming, worldwide. **Vanity metrics are useless here.** This site cannot win on volume; it wins on being the only good result for specific queries.

### 7.1 The four metrics that matter

| Metric | Source | Why it matters |
|---|---|---|
| **Search impressions** | Search Console | **Leading indicator.** Shows the queries exist at all, before any clicks. Most important in months 1–3. |
| **Lesson-2 progression** | Analytics | Of people who read lesson 1, how many reach lesson 2? Measures whether the teaching works. |
| **Deep-lesson ratio** | Analytics | Pageviews on `2.1`+`2.2` ÷ pageviews on `0.1`. Did anyone get past the beginning? Replaces return-visitor rate, which Cloudflare Web Analytics is cookieless and does not report. Needs only pageview counts, which it does report. |
| **Discussion posts** | GitHub | **Highest-signal single metric.** Posting takes real effort — one post outweighs a hundred pageviews. |

Deliberately **not** tracked: bounce rate, time on page, session duration. At this scale they are noise.

### 7.2 What "working" looks like

Honest ranges for a niche Arabic technical site on a new domain:

| Month | Sessions/month | Read as |
|---|---|---|
| 1–2 | 20–100 | Normal. Indexing hasn't happened yet. **Do not draw conclusions.** |
| 3 | 100–300 | On track |
| 6 | 500–1500 | Working |
| 6 | < 100 | Search isn't going to carry this — distribution must come from LinkedIn instead |

Supporting signals: a deep-lesson ratio above 20% means the content is good. Lesson-1→lesson-2 progression above 40% means the curriculum works — derived by hand from two pageview counts, not reported directly. **Anyone reaching lesson 3 or beyond is the strongest signal available** — that person is actually learning, not bouncing.

### 7.3 The decision point

**Month 6 review.** Three outcomes:

- **Traffic arriving and people progressing** → build the paid structured curriculum (full PDF, exercises with solutions), sell via Airtm/Gumroad
- **Little traffic but strong engagement from the few who arrive** → the content is right, distribution is wrong. Push harder on LinkedIn, where an audience already exists.
- **Neither** → the site still stands as a credential, which was always the larger return. Stop adding lessons; keep it live.

### 7.4 Implementation

**Launch:** Cloudflare Web Analytics (free, cookieless, no consent banner) + Search Console verified day one. Nothing else.

**Later, if traffic justifies it:** lesson-completion events via a small Worker + KV. Not before — it is a solution to a problem that may never arrive.

---

## 8. Content pipeline

MDX in the repo. No CMS.

```
content/
  rust/01-foundations/01-variables.mdx
  problems/rust-analyzer-not-working.mdx
cache/asm/<hash>.json          committed — never re-fetched
components/visuals/            one component per visual
```

Frontmatter: title, description, module, order, minutes, prerequisites, `published`.

Write on leave → commit → auto-deploy. Drafts sit with `published: false`.

---

## 9. Deferred

**CUDA track.** Compiler Explorer does support compiling *and executing* CUDA on real GPUs, so this is viable later at zero cost — but not at launch. The Rust track must prove the format first.

Also deferred: paid product, progress tracking, cross-site search, PDF exports, English content.

---

## 10. Build order

### Leave period 1 — ship

**Succeeds on exactly two things: the site is live on the real domain, and mixed-direction rendering is correct at 380px.** Everything below those two can slip a task without consequence. If something has to give, give up the polish and keep the deploy.

- Next.js scaffold, static export, Cloudflare Pages, domain live
- RTL + typography + dark mode, verified with mixed Arabic/English at 380px in CI
- Nine lessons: 0.1–0.4, 1.1–1.3, 2.1, 2.2 — all new writing
- Stack/heap panel + **ownership step-through visualiser** (`MemoryStepper`)
- Runnable blocks via Playground link-out (tier 1 only)
- Five problem pages
- Giscus + pinned expectations notice
- Admin page §6.1 and §6.2
- `sitemap.xml`, `robots.txt`, RSS, 404, Search Console verified
- One LinkedIn announcement post

### Leave period 2 — depth
- Lesson 1.4 (deferred from launch) with its static SVG
- Module 2 completed (2.3–2.5) with visuals
- Five more problem pages
- Inline playground execution (tier 2), with clean fallback
- First `showAsm` lesson end-to-end, to validate the build-time pipeline
- Per-lesson OG cards

### Leave period 3 — modules 3 and 4, then review at month 6

---
