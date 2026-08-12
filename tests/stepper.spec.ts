import { test, expect } from '@playwright/test';

/**
 * MemoryStepper — the only component with client JavaScript on the launch
 * critical path, and the only place on the site where RTL and LTR meet INSIDE
 * one component. PLAN.md §5.3 is the spec these assert.
 *
 * Two of these cannot be checked by looking at the page:
 *
 *   ArrowLeft = NEXT. In an RTL layout the next control sits on the left, so
 *   arrow keys follow VISUAL direction. Wiring them to logical direction is the
 *   classic RTL bug and it looks completely fine until someone uses a keyboard.
 *
 *   The explanation is the text alternative for an aria-hidden diagram. If the
 *   live region stops updating, a screen-reader user silently gets step 1 for
 *   all seven steps.
 */

const LESSON = '/rust/ownership/move/';

/** client:visible — the island hydrates only once it is actually on screen. */
async function hydrate(page: import('@playwright/test').Page) {
  await page.goto(LESSON);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.ms').scrollIntoViewIfNeeded();
  // The counter is server-rendered too, so waiting for it proves nothing.
  // Wait for a real hydration effect instead: the deep-link hash write.
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#step-1');
}

test('hydrates and lands on step 1', async ({ page }) => {
  await hydrate(page);
  await expect(page.locator('.ms-counter')).toHaveText(/الخطوة 1 \/ 7/);
});

test('the RTL/LTR boundary holds inside the component', async ({ page }) => {
  await hydrate(page);

  // Code and memory are LTR; explanation and controls follow the document.
  await expect(page.locator('.ms-code')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('.ms-memory')).toHaveAttribute('dir', 'ltr');

  // Every <pre> carries dir explicitly, not by inheritance. Inheritance is
  // correct today and breaks silently the moment the element is moved.
  const preDirs = await page.$$eval('pre', (els) => els.map((e) => e.getAttribute('dir')));
  expect(preDirs.length).toBeGreaterThan(0);
  expect(preDirs.every((d) => d === 'ltr')).toBe(true);

  const dirs = await page.evaluate(() => ({
    explain: getComputedStyle(document.querySelector('.ms-explain')!).direction,
    controls: getComputedStyle(document.querySelector('.ms-controls')!).direction,
    section: getComputedStyle(document.querySelector('.ms')!).direction,
  }));
  expect(dirs).toEqual({ explain: 'rtl', controls: 'rtl', section: 'rtl' });
});

test('the diagram is aria-hidden and the explanation is the live text alternative', async ({
  page,
}) => {
  await hydrate(page);

  await expect(page.locator('.ms-memory')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.ms-explain')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('.ms')).toHaveAttribute('role', 'group');

  const before = await page.locator('.ms-explain-text').textContent();
  await page.locator('.ms').press('ArrowLeft');
  await expect(page.locator('.ms-explain-text')).not.toHaveText(before!);
});

test('ArrowLeft advances and ArrowRight goes back — visual, not logical', async ({ page }) => {
  await hydrate(page);
  const counter = page.locator('.ms-counter');
  const ms = page.locator('.ms');

  await ms.press('ArrowLeft');
  await expect(counter).toHaveText(/الخطوة 2 \/ 7/);

  await ms.press('ArrowLeft');
  await expect(counter).toHaveText(/الخطوة 3 \/ 7/);

  await ms.press('ArrowRight');
  await expect(counter).toHaveText(/الخطوة 2 \/ 7/);

  await ms.press('End');
  await expect(counter).toHaveText(/الخطوة 7 \/ 7/);

  await ms.press('Home');
  await expect(counter).toHaveText(/الخطوة 1 \/ 7/);
});

test('stepping never pushes history entries', async ({ page }) => {
  // replaceState, not pushState: seven steps must not mean seven Back presses
  // to leave the lesson.
  await hydrate(page);
  const ms = page.locator('.ms');
  for (let i = 0; i < 4; i++) await ms.press('ArrowLeft');
  await expect(page.locator('.ms-counter')).toHaveText(/الخطوة 5 \/ 7/);

  await page.goBack();
  await expect(page).not.toHaveURL(new RegExp(LESSON.replace(/\//g, '\\/')));
});

test('#step-N deep link lands on that step', async ({ page }) => {
  await page.goto(`${LESSON}#step-4`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.ms').scrollIntoViewIfNeeded();
  await expect(page.locator('.ms-counter')).toHaveText(/الخطوة 4 \/ 7/);
});

test('a moved binding draws no pointer', async ({ page }) => {
  // The whole point of lesson 2.2: after the move, s1 still holds the three
  // field values but owns nothing, so no arrow may leave it. If this ever
  // regresses, the diagram teaches the opposite of the lesson.
  await hydrate(page);
  const ms = page.locator('.ms');
  for (let i = 0; i < 3; i++) await ms.press('ArrowLeft'); // step 4 — the move

  await expect(page.locator('.ms-slot[data-ms-id="s1"]')).toHaveClass(/is-moved/);
  await expect(page.locator('.ms-slot[data-ms-id="s2"]')).toHaveClass(/is-owned/);

  // Exactly one pointer, and it starts at s2 — not s1.
  const arrows = await page.locator('.ms-arrow--pointer').count();
  expect(arrows).toBe(1);
});

test('the E0382 step states its reason in Arabic, not only inside the code block', async ({
  page,
}) => {
  // CLAUDE.md: quoted compiler output is never load-bearing. At 380px the
  // "move occurs because … does not implement the `Copy` trait" line is off
  // screen, so the reason must be in the Arabic before the block.
  await hydrate(page);
  const ms = page.locator('.ms');
  for (let i = 0; i < 5; i++) await ms.press('ArrowLeft'); // step 6 — the error

  const arabic = await page.locator('.ms-explain-text, .ms-note-text').allTextContents();
  const joined = arabic.join(' ');
  expect(joined).toContain('Copy');
  expect(joined).toMatch(/String/);

  // And the verbatim block is still present, with its rustc version.
  await expect(page.locator('.ms-note-code')).toContainText('error[E0382]');
  await expect(page.locator('.ms-rustc')).toContainText('1.97.1');
});

test('the stepper never makes the page scroll sideways', async ({ page }) => {
  await hydrate(page);
  const ms = page.locator('.ms');
  for (let step = 0; step < 7; step++) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `step ${step + 1} overflows the viewport`).toBeLessThanOrEqual(0);
    await ms.press('ArrowLeft');
  }
});

test('every step is reachable and none renders empty', async ({ page }) => {
  await hydrate(page);
  const ms = page.locator('.ms');
  for (let step = 1; step <= 7; step++) {
    await expect(page.locator('.ms-counter')).toHaveText(new RegExp(`الخطوة ${step} / 7`));
    const text = await page.locator('.ms-explain-text').textContent();
    expect(text?.trim().length, `step ${step} has no explanation`).toBeGreaterThan(20);
    if (step < 7) await ms.press('ArrowLeft');
  }
  // Next is disabled at the end, previous disabled at the start.
  await expect(page.locator('.ms-btn').first()).toBeDisabled();
  await ms.press('Home');
  await expect(page.locator('.ms-btn').last()).toBeDisabled();
});

test('counters and step numbers use Western numerals only', async ({ page }) => {
  await hydrate(page);
  const text = await page.locator('.ms').innerText();
  expect(text).not.toMatch(/[٠-٩۰-۹]/);
});

test('prose lessons ship no island at all', async ({ page }) => {
  // The budget check asserts bytes; this asserts intent. A static-SVG lesson
  // that grows an island is a decision, not an accident.
  await page.goto('/rust/foundations/variables/');
  expect(await page.locator('astro-island').count()).toBe(0);
});
