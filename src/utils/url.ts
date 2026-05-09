/**
 * Prepends the Astro base URL to an internal path.
 * Required when `base` is set in astro.config.mjs (e.g. GitHub Pages sub-path).
 * Usage: url('/about') → '/VMV_SA.github.io/about'
 */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}
