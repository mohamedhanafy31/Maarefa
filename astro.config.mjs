import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import { SITE_URL } from './src/lib/site.ts';

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
    },
    rehypePlugins: [
      // Astro generates the heading ids itself; this only adds the anchors.
      [rehypeAutolinkHeadings, {
        behavior: 'append',
        properties: { className: 'heading-anchor', ariaHidden: 'true', tabIndex: -1 },
        content: { type: 'text', value: '#' },
      }],
    ],
  },
});
