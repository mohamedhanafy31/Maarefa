// Generate public/og-default.png — the social card.
//
//   node scripts/make-og.mjs
//
// Run once, commit the PNG. NOT part of the build: it needs a browser, and a
// Cloudflare Pages build that needs a browser is a build that fails while the
// author is away with no laptop.
//
// Playwright rather than a canvas library, for one reason: the card is in
// Arabic, and Arabic is a joining script. Drawing it needs GSUB/GPOS shaping —
// the same thing scripts/verify-fonts.py exists to protect. A browser already
// does that correctly with the site's own subset fonts, so the card is
// guaranteed to render the same letterforms the site does.
//
// Per-lesson cards are explicitly out of scope (CLAUDE.md); this is the one
// site-wide card.

import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const b64 = (p) => readFileSync(join(root, p)).toString('base64');
const arabic = b64('public/fonts/plex-arabic-600.woff2');
const mono = b64('public/fonts/jetbrains-mono-400.woff2');

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>
  @font-face { font-family: 'Plex'; src: url(data:font/woff2;base64,${arabic}) format('woff2'); font-weight: 600; }
  @font-face { font-family: 'Mono'; src: url(data:font/woff2;base64,${mono}) format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; background: #0D1117; color: #E6EDF3;
    font-family: 'Plex', sans-serif; display: flex; align-items: center;
    padding: 0 84px; gap: 64px; overflow: hidden;
  }
  .art { flex: 0 0 300px; display: grid; gap: 12px; }
  .slot {
    height: 52px; background: #161B22; border-inline-start: 5px solid #2DD4BF;
    display: flex; align-items: center; padding-inline-start: 16px;
    font-family: 'Mono', monospace; font-size: 17px; color: #9198A1; direction: ltr;
  }
  .slot.moved { border-inline-start-color: #8B949E; opacity: .5; }
  .heap {
    /* direction:ltr is load-bearing. The document is RTL, and without this the
       flex row lays the cells out right-to-left, so "hello" renders "olleh" —
       exactly the bidi failure the whole site's dir= discipline exists to
       prevent, reproduced in the social card. */
    direction: ltr;
    height: 66px; background: #1C2128; border: 2px solid #2DD4BF; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 10px;
  }
  .cell {
    width: 30px; height: 34px; border: 1px solid #6E7681; display: grid; place-items: center;
    font-family: 'Mono', monospace; font-size: 15px; color: #E6EDF3;
  }
  .txt { flex: 1; }
  h1 { font-size: 92px; line-height: 1; letter-spacing: -.01em; }
  .rule { width: 260px; height: 6px; background: #2DD4BF; margin: 26px 0; }
  p { font-size: 38px; color: #9198A1; line-height: 1.45; }
  .foot {
    /* LTR text inside an RTL column: direction:ltr keeps the characters in
       order, text-align:right keeps the line under the wordmark instead of
       flying to the far edge of the flex column. */
    margin-top: 34px; font-family: 'Mono', monospace; font-size: 22px;
    color: #2DD4BF; direction: ltr; text-align: right;
  }
</style></head><body>
  <div class="art">
    <div class="slot">s1: String</div>
    <div class="slot moved">s2 &larr; moved</div>
    <div class="heap">
      <div class="cell">h</div><div class="cell">e</div><div class="cell">l</div>
      <div class="cell">l</div><div class="cell">o</div>
    </div>
  </div>
  <div class="txt">
    <h1>معرفة</h1>
    <div class="rule"></div>
    <p>اعرف اللي بيحصل تحت الكود</p>
    <div class="foot">maarefa &middot; Rust</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const buf = await page.screenshot({ type: 'png' });
await browser.close();

const out = join(root, 'public/og-default.png');
writeFileSync(out, buf);
console.log(`wrote public/og-default.png — ${buf.length} bytes, 1200x630`);
