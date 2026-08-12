// Render pages for human review BEFORE any screenshot becomes a Playwright
// baseline. A golden-screenshot test protects against regression, not against
// being wrong the first time: if the Arabic subset is broken, the baseline
// captures broken output and CI preserves it forever.
//
//   node scripts/render-review.mjs
//
// Output lands in review/ (gitignored). Nothing here is a baseline.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = 'review';
mkdirSync(OUT, { recursive: true });

const shots = [
  { path: '/rtl-test/', width: 320, name: 'rtl-320' },
  { path: '/rtl-test/', width: 380, name: 'rtl-380' },
  { path: '/rtl-test/', width: 768, name: 'rtl-768' },
  { path: '/rtl-test/', width: 1440, name: 'rtl-1440' },
  { path: '/', width: 380, name: 'landing-380' },
];

const browser = await chromium.launch();
for (const { path, width, name } of shots) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: 'dark' });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`  ${OUT}/${name}.png  (${width}px)`);
  await page.close();
}

// Light theme too — the palette has to hold in both.
const page = await browser.newPage({ viewport: { width: 380, height: 900 }, colorScheme: 'dark' });
await page.goto(BASE + '/rtl-test/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${OUT}/rtl-380-light.png`, fullPage: true });
console.log(`  ${OUT}/rtl-380-light.png  (380px, light)`);

await browser.close();
