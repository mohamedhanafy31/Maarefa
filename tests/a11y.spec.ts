import { test, expect } from '@playwright/test';

/**
 * Structural accessibility checks that Lighthouse flagged and that are easy to
 * regress silently.
 *
 * landmark-one-main failed on every lesson and problem page: both layouts
 * wrapped their body in <article id="main"> with no <main> element anywhere, so
 * assistive tech had no main landmark and the skip link jumped to a generic
 * article. Nothing about the page LOOKED wrong, which is why this is a test
 * rather than a thing to remember.
 */

const PAGES = [
  '/',
  '/rust/',
  '/problems/',
  '/about/',
  '/discuss/',
  '/rust/ownership/move/',
  '/rust/ownership/stack-heap/',
  '/rust/foundations/functions/',
  '/problems/string-vs-str-mismatch/',
];

for (const url of PAGES) {
  test(`exactly one main landmark and one h1: ${url}`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('main#main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);

    // The skip link must point at that landmark, not at a heading or a wrapper.
    expect(await page.locator('.skip-link').getAttribute('href')).toBe('#main');
  });
}

test('every page declares Arabic and RTL at the document level', async ({ page }) => {
  for (const url of PAGES) {
    await page.goto(url);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  }
});

test('no page body contains Eastern Arabic-Indic digits', async ({ page }) => {
  // The content lint covers content/; this covers the chrome the layouts render
  // — counters, reading times, module positions.
  for (const url of PAGES) {
    await page.goto(url);
    const text = await page.locator('body').innerText();
    expect(text, url).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
  }
});
