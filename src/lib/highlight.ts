/**
 * Build-time syntax highlighting for the MemoryStepper code panel.
 *
 * The stepper needs the source split PER LINE so it can put a rail and a tint
 * on the line the current step is about. Astro's markdown pipeline emits one
 * blob, so this calls Shiki directly and returns an array of line HTML.
 *
 * Runs at build only. Nothing here ships to the client — the island receives
 * plain strings as a prop.
 *
 * Themes and defaultColor MUST match astro.config.mjs: tokens carry
 * --shiki-light / --shiki-dark rather than a baked-in colour, and the choice
 * between them is made in CSS so the code follows the site theme.
 */

import { codeToTokens } from 'shiki';
import type { BundledLanguage } from 'shiki';

const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styleAttr(style: string | Record<string, string> | undefined): string {
  if (!style) return '';
  const css =
    typeof style === 'string'
      ? style
      : Object.entries(style)
          .map(([k, v]) => `${k}:${v}`)
          .join(';');
  return css ? ` style="${escapeHtml(css)}"` : '';
}

/**
 * Highlight `code` as Rust and return one HTML string per source line.
 * A trailing newline is dropped so line count matches what the author wrote.
 */
export async function highlightLines(
  code: string,
  lang: BundledLanguage = 'rust',
): Promise<string[]> {
  const { tokens } = await codeToTokens(code.replace(/\n$/, ''), {
    lang,
    themes: THEMES,
    defaultColor: false,
  });

  return tokens.map((line) =>
    line
      .map((t) => `<span${styleAttr(t.htmlStyle)}>${escapeHtml(t.content)}</span>`)
      .join(''),
  );
}
