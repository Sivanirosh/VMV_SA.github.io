import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  site: 'https://sivanirosh.github.io',
  base: '/VMV_SA.github.io',
  integrations: [tailwind()],
});
