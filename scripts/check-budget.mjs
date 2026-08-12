// Per-page JavaScript budget. Fails the build when a route exceeds it.
//
// PLAN.md §7. The landing page budget is an absolute 0 bytes of external JS —
// achievable because Astro emits no framework runtime. There is no baseline to
// subtract, so this measures the real number rather than a delta.
//
//   node scripts/check-budget.mjs

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';

// route pattern → max gzipped bytes of JS the page may pull in.
//
// `island: true` rows apply ONLY to pages that actually mount an Astro island.
// That distinction is the point of the table: a lesson with a MemoryStepper and
// a lesson without one have completely different floors, and collapsing them
// into one row would let an accidental island on a prose lesson pass unnoticed.
const BUDGETS = [
  { match: /^index\.html$/, label: 'landing', externalJs: 0, inlineJs: 1024 },
  { match: /^rtl-test\//, label: 'rtl fixture', externalJs: 0, inlineJs: 1024 },

  // A lesson carrying MemoryStepper. 14 KB external per PLAN.md §7, sized from
  // the measured 7.5 KB Preact island floor — the stepper came in at 10.6 KB.
  //
  // The 6 KB inline figure is NOT a relaxed version of the 1 KB below; it is a
  // different thing being measured. Astro inlines its own island bootstrap on
  // any page with a client: directive, and that is not code this project wrote:
  //
  //     4380 B  <astro-island> custom element + props deserialiser
  //      372 B  the client:visible IntersectionObserver shim
  //      309 B  our anti-FOUC theme script (the one budgeted exception, C3)
  //     ------
  //     5061 B  measured 2026-08-13
  //
  // 6 KB leaves headroom for an Astro patch release to grow its bootstrap
  // slightly without turning into a red build, and still fails loudly if this
  // project starts shipping inline logic of its own.
  {
    match: /^rust\/.*\/index\.html$/,
    island: true,
    label: 'lesson+island',
    externalJs: 14 * 1024,
    inlineJs: 6 * 1024,
  },

  // A lesson with no visual, or one whose visual is a static SVG. These must
  // stay at the same absolute zero as any other prose page — an island here
  // means a component was added without anyone deciding to spend the budget.
  {
    match: /^rust\/.*\/index\.html$/,
    island: false,
    label: 'lesson',
    externalJs: 0,
    inlineJs: 1024,
  },

  // /admin/ is the one page where a runtime fetch IS the feature: the reader
  // reports panel calls GitHub's REST API from the browser, because there is no
  // server to call it from. It sits behind Cloudflare Access, is noindex, and
  // is loaded by one person on purpose — none of the reasons the other budgets
  // exist (SEO, first paint for strangers, mobile data) apply to it.
  // Measured 2091 B inline: 309 theme + ~1.8 KB fetch-and-render.
  { match: /^admin\//, label: 'admin', externalJs: 10 * 1024, inlineJs: 4096 },
  { match: /.*/, island: false, label: 'prose', externalJs: 0, inlineJs: 1024 },
  { match: /.*/, label: 'prose+island', externalJs: 14 * 1024, inlineJs: 6 * 1024 },
];

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* htmlFiles(full);
    else if (entry.endsWith('.html')) yield full;
  }
}

if (!existsSync(DIST)) {
  console.error(`no ${DIST}/ — run the build first`);
  process.exit(1);
}

let failed = 0;
const rows = [];

for (const file of htmlFiles(DIST)) {
  const route = relative(DIST, file);
  const html = readFileSync(file, 'utf8');

  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const preloads = [...html.matchAll(/rel="modulepreload"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  // Astro islands reference their component and renderer as attributes rather
  // than script tags, so counting only <script src> would under-report.
  const islands = [
    ...html.matchAll(/(?:component-url|renderer-url)="([^"]+\.js)"/g),
  ].map((m) => m[1]);

  const seen = new Set();
  let externalGz = 0;
  const walk = (url) => {
    const path = join(DIST, url.replace(/^\//, '').split('?')[0]);
    if (seen.has(path) || !existsSync(path)) return;
    seen.add(path);
    const buf = readFileSync(path);
    externalGz += gzipSync(buf, { level: 9 }).length;
    for (const m of buf.toString('utf8').matchAll(/(?:from|import)"(\.\/[^"]+\.js)"/g)) {
      walk('/_astro/' + m[1].replace('./', ''));
    }
  };
  for (const u of [...srcs, ...preloads, ...islands]) walk(u);

  // Inline JavaScript only. A type="application/ld+json" block is DATA — no
  // parser runs it, it costs no main-thread time, and counting it would push
  // pages over a budget that exists to cap executable code. It still costs
  // transfer bytes, which the HTML size covers.
  const inlineBytes = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attrs]) => !/\ssrc=/.test(attrs) && !/ld\+json/.test(attrs))
    .reduce((n, m) => n + Buffer.byteLength(m[2]), 0);

  const hasIsland = html.includes('<astro-island');
  const budget = BUDGETS.find(
    (b) => b.match.test(route) && (b.island === undefined || b.island === hasIsland),
  );
  const overExternal = externalGz > budget.externalJs;
  const overInline = inlineBytes > budget.inlineJs;
  if (overExternal || overInline) failed++;

  rows.push({
    route, label: budget.label, externalGz, inlineBytes,
    budget, ok: !overExternal && !overInline,
  });
}

const w = Math.max(...rows.map((r) => r.route.length), 20);
console.log(`  ${'route'.padEnd(w)}  ${'kind'.padEnd(11)}  ext JS gz   inline    budget`);
console.log('  ' + '-'.repeat(w + 46));
for (const r of rows.sort((a, b) => a.route.localeCompare(b.route))) {
  console.log(
    `  ${r.ok ? ' ' : '!'} ${r.route.padEnd(w - 2)}  ${r.label.padEnd(11)}  ` +
    `${String(r.externalGz).padStart(9)}   ${String(r.inlineBytes).padStart(6)}    ` +
    `${r.budget.externalJs}/${r.budget.inlineJs}`
  );
}

console.log();
if (failed) {
  console.error(`FAIL — ${failed} route(s) over budget.`);
  console.error('Raising a budget is a decision, not a fix. PLAN.md §7 explains');
  console.error('why prose pages stay at an absolute zero.');
  process.exit(1);
}
console.log(`PASS — ${rows.length} route(s) within budget.`);
