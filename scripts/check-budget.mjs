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

// route pattern → max gzipped bytes of JS the page may pull in
const BUDGETS = [
  { match: /^index\.html$/, label: 'landing', externalJs: 0, inlineJs: 1024 },
  { match: /^rtl-test\//, label: 'rtl fixture', externalJs: 0, inlineJs: 1024 },
  // Lessons carrying MemoryStepper land here at P3. 14 KB per PLAN.md §7,
  // sized from the measured 7.5 KB Preact island floor.
  { match: /^rust\/.*\/index\.html$/, label: 'lesson', externalJs: 14 * 1024, inlineJs: 2048 },
  { match: /^admin\//, label: 'admin', externalJs: 10 * 1024, inlineJs: 2048 },
  { match: /.*/, label: 'prose', externalJs: 2 * 1024, inlineJs: 2048 },
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

  const inlineBytes = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .reduce((n, m) => n + Buffer.byteLength(m[1]), 0);

  const budget = BUDGETS.find((b) => b.match.test(route));
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
