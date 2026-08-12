// Physical CSS properties are a silent RTL bug: `margin-left` looks correct in
// a left-to-right dev browser and puts the gap on the wrong side of an Arabic
// page. CLAUDE.md makes logical properties a hard rule; this enforces it.
//
//   node scripts/check-logical-props.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src'];
const EXTS = ['.css', '.astro', '.tsx', '.ts'];

// Physical properties with a logical equivalent. `top`/`bottom` are fine —
// block direction does not flip in RTL — so only the inline axis is policed.
//
// Every pattern excludes a preceding dot. These files are not all CSS, and a
// CSS property name is never preceded by `.` — but a JavaScript ternary reads
// exactly like a declaration to a naive regex:
//
//     const x1 = (leftToRight ? ra.right : ra.left + w) - base.left;
//                                    ^^^^^^^^ looks like `right:`
//
// Those are DOMRect reads in MemoryStepper's arrow measurement, and flagging
// them is a false positive. A checker that reports things which are fine gets
// switched off, and then it stops catching the things that are not.
const BANNED = [
  [/(?<![\w.-])margin-left\s*:/g, 'margin-inline-start'],
  [/(?<![\w.-])margin-right\s*:/g, 'margin-inline-end'],
  [/(?<![\w.-])padding-left\s*:/g, 'padding-inline-start'],
  [/(?<![\w.-])padding-right\s*:/g, 'padding-inline-end'],
  [/(?<![\w.-])border-left\s*:/g, 'border-inline-start'],
  [/(?<![\w.-])border-right\s*:/g, 'border-inline-end'],
  [/(?<![\w.-])(?<!inset-inline-)(?<!scroll-)left\s*:/g, 'inset-inline-start'],
  [/(?<![\w.-])(?<!inset-inline-)(?<!scroll-)right\s*:/g, 'inset-inline-end'],
  [/text-align\s*:\s*(left|right)/g, 'text-align: start / end'],
];

// `pre` is deliberately dir="ltr" and text-align:left — code must not flip.
const ALLOW = /text-align:\s*left;\s*(\/\*|$)|direction:\s*ltr/;

function* files(dir) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (EXTS.some((x) => e.endsWith(x))) yield full;
  }
}

let violations = 0;
for (const root of ROOTS) {
  for (const file of files(root)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.trim().startsWith('*') || line.trim().startsWith('//')) return;
      for (const [re, fix] of BANNED) {
        re.lastIndex = 0;
        if (re.test(line)) {
          // The one legitimate exception: LTR code surfaces.
          if (ALLOW.test(line)) continue;
          console.error(`  ${file}:${i + 1}  ${line.trim()}`);
          console.error(`    → use ${fix}`);
          violations++;
        }
      }
    });
  }
}

if (violations) {
  console.error(`\nFAIL — ${violations} physical propert${violations === 1 ? 'y' : 'ies'}.`);
  console.error('These read correctly in an LTR browser and break the Arabic layout.');
  process.exit(1);
}
console.log('PASS — no physical inline-axis properties.');
