import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import { SITE_URL } from './src/lib/site.ts';
import { codeTiersPlugin } from './src/plugins/code-tiers.ts';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory' },

  integrations: [mdx(), preact()],

  markdown: {
    // Astro highlights with Shiki; the theme is ours so no library skin ships.
    // The dir="ltr" wrapper and the plain/runnable/showAsm tiers are applied by
    // src/plugins/code-tiers.ts, which reads the code-fence meta string.
    shikiConfig: {
      // Dual themes with defaultColor:false. Shiki then emits --shiki-light /
      // --shiki-dark custom properties per token instead of a hard-coded
      // `color:` and `background-color:` on every element.
      //
      // Two things depended on this. A single theme inlines
      // `background-color:#24292e` on the <pre>, which beats the stylesheet's
      // `var(--surface)` — so (a) the scroll-affordance cover gradients in
      // global.css painted --surface over a different background and showed as
      // bars at both edges, and (b) the block stayed dark in light theme while
      // the covers went light. Both disappear once Shiki stops writing the
      // background at all and the stylesheet owns it again.
      //
      // The token colours are re-applied from the custom properties in
      // global.css §syntax.
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: false,
      // Astro 7 does not carry the code-fence meta string into the rehype tree,
      // so `​```rust runnable` arrives indistinguishable from `​```rust` and every
      // block silently renders as the `plain` tier. Shiki still has the raw meta
      // at highlight time, so stamp it onto the <pre> for code-tiers.ts to read.
      // The attribute is consumed and removed there — it never ships.
      //
      // A plain object literal, so this costs no dependency.
      transformers: [
        {
          name: 'preserve-fence-meta',
          pre(node) {
            const raw = this.options.meta?.__raw;
            if (raw) node.properties['data-meta'] = raw;
          },
        },
      ],
    },
    rehypePlugins: [
      // codeTiersPlugin runs first: it wraps <pre> elements in <div data-tier>.
      // rehypeAutolinkHeadings must run after so it operates on the final tree.
      codeTiersPlugin,
      // Astro generates the heading ids itself; this only adds the anchors.
      [rehypeAutolinkHeadings, {
        behavior: 'append',
        properties: { className: 'heading-anchor', ariaHidden: 'true', tabIndex: -1 },
        content: { type: 'text', value: '#' },
      }],
    ],
  },
});
