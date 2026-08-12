/**
 * src/plugins/code-tiers.ts — rehype plugin for code-block post-processing
 *
 * Runs AFTER Astro's built-in Shiki highlighter has already rendered fenced
 * code blocks to <pre><code> HTML. We only own the wrapper markup.
 *
 * What this plugin does:
 *   1. Every <pre> gets dir="ltr" and tabindex="0".
 *      - dir="ltr" is belt-and-braces alongside the CSS `direction: ltr` on
 *        pre elements (global.css). Both are needed: CSS can be overridden;
 *        the HTML attribute is the canonical bidi hint for screen readers.
 *      - tabindex="0" satisfies WCAG 2.1 SC 2.1.1: a scrollable region must
 *        be keyboard reachable. Detected by overflow, but we can't detect
 *        overflow at build time without JS, so every pre gets it.
 *   2. Reads the fence meta string for a tier keyword: plain (default),
 *      runnable, showAsm. Exposes it as data-tier on a <div class="code-wrapper">
 *      that wraps the <pre>.
 *   3. runnable: appends a link to play.rust-lang.org with the source code
 *      URL-encoded into ?code=. Link text: افتح في Playground.
 *   4. showAsm: reserves the data-tier attribute only. No extra markup yet
 *      (period-2 work).
 *
 * The tier keyword occupies the meta string after the language identifier,
 * e.g. ```rust runnable. Astro's Shiki integration stores this as the
 * data-meta property on the <pre> element in the hast.
 *
 * Wire-up in astro.config.mjs:
 *   import { codeTiersPlugin } from './src/plugins/code-tiers.ts';
 *   markdown: { rehypePlugins: [codeTiersPlugin, ...] }
 */

// Minimal hast-compatible type definitions to avoid importing @types/hast
// (which is a transitive dep, not a direct dep, and pnpm strict mode would
// reject the import). These cover exactly what we need.

type HastProperties = Record<string, unknown>;

interface HastText {
  type: 'text';
  value: string;
}

interface HastElement {
  type: 'element';
  tagName: string;
  properties: HastProperties;
  children: HastNode[];
  data?: Record<string, unknown>;
}

type HastNode = HastElement | HastText | { type: string; children?: HastNode[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively extract plain-text content from a hast node. */
function nodeText(node: HastNode): string {
  if (node.type === 'text') return (node as HastText).value;
  const children = (node as { children?: HastNode[] }).children;
  if (children) return children.map(nodeText).join('');
  return '';
}

/**
 * Read the code fence meta string from a <pre> element.
 *
 * Astro's Shiki integration stores the raw meta (everything after the language
 * identifier on the opening fence) as the `data-meta` attribute on <pre>.
 * In hast, data attributes are preserved with the `data-` prefix as the key.
 * We also check dataMeta (camelCase form) and the child <code> element for
 * resilience across Shiki / Astro version variations.
 */
function getMeta(pre: HastElement): string {
  // Check the <pre> itself first
  const fromPre =
    (pre.properties['data-meta'] as string | undefined) ??
    (pre.properties['dataMeta'] as string | undefined) ??
    (pre.data?.['meta'] as string | undefined) ??
    '';
  if (fromPre) return fromPre;

  // Fall back to the child <code> element
  const codeEl = pre.children.find(
    (c): c is HastElement => c.type === 'element' && (c as HastElement).tagName === 'code',
  );
  if (!codeEl) return '';

  return (
    (codeEl.properties['data-meta'] as string | undefined) ??
    (codeEl.properties['dataMeta'] as string | undefined) ??
    (codeEl.data?.['meta'] as string | undefined) ??
    ''
  );
}

type Tier = 'plain' | 'runnable' | 'showAsm';

function parseTier(meta: string): Tier {
  if (meta.includes('runnable')) return 'runnable';
  if (meta.includes('showAsm')) return 'showAsm';
  return 'plain';
}

/** Build the playground link element for a runnable code block. */
function makePlaygroundLink(code: string): HastElement {
  const url = `https://play.rust-lang.org/?code=${encodeURIComponent(code)}&edition=2021`;
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: url,
      class: 'playground-link',
      // The link text is Arabic so the element direction is RTL.
      // The URL in href is LTR — browsers handle this correctly.
      dir: 'rtl',
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    children: [{ type: 'text', value: 'افتح في Playground' }],
  };
}

/**
 * Walk the hast tree visiting <pre> elements only.
 * We iterate a copy of the children array so in-place replacements are safe.
 * After replacing a <pre> with a wrapper <div>, we do NOT recurse into the
 * wrapper — the <pre> inside it has already been processed.
 */
function walkPre(
  node: { children?: HastNode[] },
  callback: (el: HastElement, index: number, parent: { children: HastNode[] }) => void,
): void {
  if (!node.children) return;
  // Snapshot length; we replace in-place but never change array length here.
  const len = node.children.length;
  for (let i = 0; i < len; i++) {
    const child = node.children[i];
    if (child.type === 'element' && (child as HastElement).tagName === 'pre') {
      callback(child as HastElement, i, node as { children: HastNode[] });
      // Do not recurse: the replaced wrapper will contain the <pre> as a child,
      // and we must not process it again.
    } else {
      walkPre(child as { children?: HastNode[] }, callback);
    }
  }
}

// ── Plugin ────────────────────────────────────────────────────────────────────

/**
 * codeTiersPlugin — rehype plugin factory.
 *
 * Usage in astro.config.mjs:
 *   import { codeTiersPlugin } from './src/plugins/code-tiers.ts';
 *   markdown: { rehypePlugins: [codeTiersPlugin] }
 *
 * No options — the plugin reads everything it needs from the hast.
 */
export function codeTiersPlugin() {
  // Return the transformer function. Astro calls this with the root hast node.
  return function transformer(tree: unknown): void {
    walkPre(tree as { children?: HastNode[] }, (pre, index, parent) => {
      const meta = getMeta(pre);
      const tier = parseTier(meta);

      // Mutate <pre>: add dir="ltr" and tabindex="0".
      // Logical-property checker (scripts/check-logical-props.mjs) scans *.ts
      // files; these are HTML attributes, not CSS properties, so they pass.
      pre.properties = {
        ...pre.properties,
        dir: 'ltr',
        tabIndex: 0,
      };

      // data-meta is plumbing between the Shiki transformer in astro.config.mjs
      // and this plugin. Now that the tier is resolved, drop it — shipping it
      // would leak an implementation detail into every page's HTML.
      delete pre.properties['data-meta'];
      delete pre.properties['dataMeta'];

      // Build the wrapper's children list.
      const wrapperChildren: HastNode[] = [pre];

      if (tier === 'runnable') {
        // Extract raw source text for the Playground URL.
        // The <code> child contains the highlighted spans; nodeText() gives
        // the plain text without any markup.
        const codeEl = pre.children.find(
          (c): c is HastElement => c.type === 'element' && (c as HastElement).tagName === 'code',
        );
        const sourceCode = codeEl ? nodeText(codeEl) : nodeText(pre);
        wrapperChildren.push(makePlaygroundLink(sourceCode));
      }
      // showAsm: data-tier attribute is set on the wrapper; no extra markup yet.

      // Replace the <pre> with <div class="code-wrapper" data-tier="…">
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          class: 'code-wrapper',
          'data-tier': tier,
        },
        children: wrapperChildren,
      } satisfies HastElement;
    });
  };
}
