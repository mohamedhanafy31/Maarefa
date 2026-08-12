// How many monospace columns actually fit inside a <pre> at a given viewport.
//
// Rust diagnostics need roughly 60 columns before the explanatory text starts
// getting cut — the carets survive truncation but the sentence saying what
// they point at does not, which is the pedagogical payload of lesson 2.2.
//
//   node scripts/measure-columns.mjs
//
// Measures the real rendered advance width rather than assuming 0.6em, so the
// number holds if the font or the subset changes.

import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const WIDTHS = [320, 380, 768, 1440];

const browser = await chromium.launch();

console.log('  viewport   pre inner   char adv   columns   60-col?');
console.log('  ' + '-'.repeat(52));

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: 'dark' });
  await page.goto(`${BASE}/rtl-test/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const m = await page.evaluate(() => {
    // The error block — the one that matters.
    const pres = [...document.querySelectorAll('pre')];
    const pre = pres.find((p) => p.textContent.includes('E0382')) ?? pres[0];
    const cs = getComputedStyle(pre);
    const inner =
      pre.clientWidth -
      parseFloat(cs.paddingInlineStart) -
      parseFloat(cs.paddingInlineEnd);

    // Measure a real 80-char run in the actual rendered font.
    const probe = document.createElement('span');
    probe.style.cssText =
      `font: ${cs.font}; white-space: pre; position: absolute; visibility: hidden;`;
    probe.textContent = 'x'.repeat(80);
    pre.appendChild(probe);
    const adv = probe.getBoundingClientRect().width / 80;
    probe.remove();

    return {
      inner,
      adv,
      fontSize: cs.fontSize,
      scrollW: pre.scrollWidth,
      clientW: pre.clientWidth,
    };
  });

  const cols = Math.floor(m.inner / m.adv);
  console.log(
    `  ${String(width).padStart(5)}px   ${m.inner.toFixed(0).padStart(6)}px   ` +
    `${m.adv.toFixed(2).padStart(6)}px   ${String(cols).padStart(5)}   ` +
    `${cols >= 60 ? 'yes' : 'NO  (' + (60 - cols) + ' short)'}   @${m.fontSize}`
  );

  await page.close();
}

await browser.close();
