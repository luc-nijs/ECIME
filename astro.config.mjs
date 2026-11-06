import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.ecime.org',
  // Old Wix addresses that have a new name, so existing links keep working.
  redirects: {
    '/ecimecommunity': '/community',
    '/ecimeresearch': '/research',
    '/ecimeinstruments': '/instruments',
    '/addpublications': '/suggest-publication',
  },
});
