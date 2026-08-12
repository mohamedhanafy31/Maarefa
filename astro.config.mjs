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
      theme: 'github-dark',
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
