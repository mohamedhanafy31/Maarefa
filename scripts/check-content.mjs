// Content lint for rules Astro's collection schemas structurally cannot check.
//
// src/content.config.ts validates FRONTMATTER — that is all a collection schema
// ever receives. The MDX body never reaches it, so `٣` in prose passes the build
// silently while the same digit in `title` is correctly rejected. This closes
// that half.
//
//   node scripts/check-content.mjs
//
// Runs before `astro build` in build:ci, so a violation fails the build rather
// than shipping.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'content';

// CLAUDE.md C2: Western numerals everywhere. Eastern Arabic-Indic digits are
// U+0660-U+0669. Note the site is Egyptian-register Arabic, where Western
// numerals are the technical-writing standard — this is not a stylistic
// preference, it is what the audience reads.
const EASTERN_DIGITS = /[٠-٩]/g;

// Extended Arabic-Indic (Persian/Urdu) digits are equally wrong and easy to
// paste in from a Farsi source.
const EXTENDED_DIGITS = /[۰-۹]/g;

const RULES = [
  { re: EASTERN_DIGITS, label: 'Eastern Arabic-Indic digit', hint: 'use Western 0-9' },
  { re: EXTENDED_DIGITS, label: 'Extended Arabic-Indic digit', hint: 'use Western 0-9' },
];

function* files(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (/\.(mdx?|ts|json)$/.test(entry)) yield full;
  }
}

let violations = 0;
let scanned = 0;

for (const file of files(ROOT)) {
  scanned++;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { re, label, hint } of RULES) {
      re.lastIndex = 0;
      const found = [...line.matchAll(re)];
      if (!found.length) continue;
      const chars = [...new Set(found.map((m) => m[0]))].join(' ');
      console.error(`  ${relative('.', file)}:${i + 1}  ${label}: ${chars}`);
      console.error(`    ${line.trim().slice(0, 90)}`);
      console.error(`    → ${hint}`);
      violations += found.length;
    }
  });
}

if (!existsSync(ROOT)) {
  console.log(`no ${ROOT}/ directory yet — nothing to check`);
  process.exit(0);
}

if (violations) {
  console.error(
    `\nFAIL — ${violations} violation(s) across ${scanned} file(s).\n` +
      'Frontmatter digits are caught by src/content.config.ts; this catches the\n' +
      'body, which a collection schema never sees.'
  );
  process.exit(1);
}
console.log(`PASS — ${scanned} content file(s), no non-Western numerals.`);
