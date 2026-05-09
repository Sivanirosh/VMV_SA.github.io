import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  site: 'https://vmv-sa.github.io',
  integrations: [tailwind()],
});
