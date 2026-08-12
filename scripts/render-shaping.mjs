// High-DPI crop of the Arabic shaping section, for human judgement of the
// letterform joins. See scripts/render-review.mjs for why this happens before
// any baseline is committed.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
mkdirSync('review', { recursive: true });

const browser = await chromium.launch();

// 3x scale so joins and diacritic positioning are actually legible.
const page = await browser.newPage({
  viewport: { width: 380, height: 900 },
  deviceScaleFactor: 3,
  colorScheme: 'dark',
});
await page.goto(`${BASE}/rtl-test/`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const section = page.locator('h2:has-text("تشكيل الحروف") ').first();
await section.scrollIntoViewIfNeeded();

// Clip from the shaping heading down through the diacritics line.
const start = await section.boundingBox();
const end = await page.locator('h2:has-text("أرقام غربية")').first().boundingBox();
await page.screenshot({
  path: 'review/shaping-380-3x.png',
  clip: { x: 0, y: start.y, width: 380, height: end.y - start.y },
});
console.log('  review/shaping-380-3x.png');

// Light theme, same crop — the palette must hold in both.
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
await page.waitForTimeout(120);
await page.screenshot({
  path: 'review/shaping-380-3x-light.png',
  clip: { x: 0, y: start.y, width: 380, height: end.y - start.y },
});
console.log('  review/shaping-380-3x-light.png');

// The code + error block, where LTR isolation has to hold.
await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
await page.locator('h2:has-text("بلوك كود")').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(120);
const codeStart = await page.locator('h2:has-text("بلوك كود")').first().boundingBox();
const codeEnd = await page.locator('h2:has-text("جدول")').first().boundingBox();
await page.screenshot({
  path: 'review/code-380-3x.png',
  clip: { x: 0, y: codeStart.y, width: 380, height: Math.min(codeEnd.y - codeStart.y, 2400) },
});
console.log('  review/code-380-3x.png');

// The error block at 320 and 380, to check the scroll affordance is visible
// and that the headline now fits.
for (const w of [320, 380]) {
  const p2 = await browser.newPage({
    viewport: { width: w, height: 900 }, deviceScaleFactor: 3, colorScheme: 'dark',
  });
  await p2.goto(`${BASE}/rtl-test/`, { waitUntil: 'networkidle' });
  await p2.evaluate(() => document.fonts.ready);
  const pre = p2.locator('pre', { hasText: 'E0382' }).first();
  await pre.scrollIntoViewIfNeeded();
  await p2.waitForTimeout(120);
  await pre.screenshot({ path: `review/error-${w}-3x.png` });
  console.log(`  review/error-${w}-3x.png`);
  await p2.close();
}

await browser.close();
