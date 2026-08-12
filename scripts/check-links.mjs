// Internal link check. A broken internal link fails the build.
//
//   node scripts/check-links.mjs
//
// Runs against dist/, after the build, so it checks what actually shipped
// rather than what the source intended. Cross-references between collections
// are already gated at build time by getStaticPaths; this catches the other
// half — hand-written hrefs inside MDX prose, which nothing else validates.
//
// EXTERNAL links are deliberately NOT fetched. A build that makes network
// requests is a build that fails when a third party has an outage, and the
// author may be 20 days from a laptop when it does. External rot is a real
// problem, but it is not one worth trading deploy reliability for.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, posix } from 'node:path';

const DIST = 'dist';

if (!existsSync(DIST)) {
  console.error(`no ${DIST}/ — run the build first`);
  process.exit(1);
}

function* files(dir, ext) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* files(full, ext);
    else if (entry.endsWith(ext)) yield full;
  }
}

// Everything the deploy can actually serve.
const served = new Set();
for (const f of files(DIST, '')) {
  const rel = '/' + relative(DIST, f).split(/[\\/]/).join('/');
  served.add(rel);
  // dist/rust/index.html is served at BOTH /rust/ and /rust/index.html.
  if (rel.endsWith('/index.html')) served.add(rel.slice(0, -'index.html'.length));
}

// id="…" per page, so #anchor targets can be checked too.
const idsByPage = new Map();
for (const f of files(DIST, '.html')) {
  const rel = '/' + relative(DIST, f).split(/[\\/]/).join('/');
  const page = rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
  const html = readFileSync(f, 'utf8').replace(/<script\b[\s\S]*?<\/script>/gi, '');
  idsByPage.set(page, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
}

let broken = 0;
let checked = 0;

for (const f of files(DIST, '.html')) {
  const rel = '/' + relative(DIST, f).split(/[\\/]/).join('/');
  const page = rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
  // Strip <script> and <style> bodies before scanning.
  //
  // Without this the checker reads href= out of JavaScript source. /admin/
  // builds its report list with string concatenation containing
  // `'<a href="' + esc(i.html_url) + '"'`, and the regex dutifully reported
  // `' + esc(i.html_url) + '` as a broken relative link. A link checker that
  // cries wolf gets switched off, which is worse than not having one.
  const html = readFileSync(f, 'utf8')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');

  for (const m of html.matchAll(/\bhref="([^"]+)"/g)) {
    const href = m[1];

    // Skip anything not an internal absolute path.
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(href)) continue;

    if (href.startsWith('#')) {
      checked++;
      const id = decodeURIComponent(href.slice(1));
      if (id && !idsByPage.get(page)?.has(id)) {
        console.error(`  ${page}  →  ${href}   (no element with that id on this page)`);
        broken++;
      }
      continue;
    }

    if (!href.startsWith('/')) {
      console.error(`  ${page}  →  ${href}   (relative href; use an absolute path)`);
      broken++;
      continue;
    }

    checked++;
    const [rawPath, hash] = href.split('#');
    const path = decodeURIComponent(rawPath.split('?')[0]);

    const candidates = [path, posix.join(path, 'index.html'), path + '/'];
    if (!candidates.some((c) => served.has(c))) {
      console.error(`  ${page}  →  ${href}   (nothing built at that path)`);
      broken++;
      continue;
    }

    if (hash) {
      const target = path.endsWith('/') ? path : path + '/';
      const ids = idsByPage.get(target) ?? idsByPage.get(path);
      // Only assert when the target page was found and parsed. #step-N deep
      // links into a MemoryStepper resolve at runtime, so they are exempt.
      if (ids && !ids.has(decodeURIComponent(hash)) && !/^step-\d+$/.test(hash)) {
        console.error(`  ${page}  →  ${href}   (target page has no id="${hash}")`);
        broken++;
      }
    }
  }
}

console.log();
if (broken) {
  console.error(`FAIL — ${broken} broken internal link(s) out of ${checked} checked.`);
  console.error('Slugs are never regenerated once published (CLAUDE.md), so a broken');
  console.error('internal link is a typo, not a move. Fix the href.');
  process.exit(1);
}
console.log(`PASS — ${checked} internal link(s), all resolve.`);
