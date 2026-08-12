# معرفة · Maarefa

Arabic technical knowledge — *learn what happens beneath the code.*

An Arabic-first learning platform for systems programming, launching with a
Rust track. Read `CLAUDE.md` before making any change; specifications are in
`docs/`, and the implementation plan is `PLAN.md`.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:4321
```

## Build

```bash
pnpm build:ci       # what Cloudflare Pages runs
```

| | |
|---|---|
| Build command | `pnpm build:ci` |
| Output directory | `dist` |
| Node version | 22 (`.node-version`) |

The build never touches the network: no Compiler Explorer calls, no browser.
Everything slow or browser-dependent runs in GitHub Actions instead, so a
failure arrives as a notification against a commit rather than a silently
stale site.

## Fonts

Subsets in `public/fonts/` are committed. Regenerate only if you must:

```bash
./scripts/subset-fonts.sh     # fetches sources, subsets to WOFF2
python3 scripts/verify-fonts.py
```

Requires `python3 -m pip install fonttools brotli uharfbuzz`.

**Never commit a subset the verifier rejects.** Arabic is a joining script:
dropping the GSUB/GPOS lookups renders disconnected letters, and it fails
*partially*, so a casual look passes. The Arabic face is subset with
`--layout-features='*'` for that reason. The mono face has `calt`/`liga`/
`dlig`/`clig` removed so `->` can never render as an arrow — a learner cannot
type a glyph they have never seen.

The verifier does not trust feature tags. It re-serialises the shipped WOFF2
and runs HarfBuzz on triple-letter runs, which must produce three distinct
positional glyphs.

## TypeScript is pinned to 6.x on purpose

`astro check` needs a programmatic API that TypeScript's native compiler (7.0+)
does not yet expose — see withastro/roadmap#1321. Upgrading to 7.x makes
`pnpm check` fail outright. Revisit when the native compiler ships that API.

`@astrojs/check` is an explicit dependency for a related reason: without it,
`astro check` prompts to install it and **exits 0 in CI without checking
anything**, so the gate looks green while verifying nothing.

## Tests

```bash
pnpm test:e2e       # RTL at 320 / 380 / 768 / 1440, both themes
pnpm check:props    # no physical inline-axis CSS
pnpm check:budget   # per-route JS budget
```

`/rtl-test/` is a permanent fixture, not a throwaway — every RTL/LTR failure
mode this site can have is on that one page.

**Screenshot baselines require human confirmation before they are committed.**
A golden screenshot protects against regression, not against being wrong the
first time: a broken Arabic subset would be captured as the baseline and
preserved by CI forever.

## Licence

Code MIT (`LICENSE`). Content CC BY-NC-SA 4.0 (`LICENSE-CONTENT`).
