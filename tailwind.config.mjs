/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#C45C2E',
        'primary-dark': '#9E4422',
        bg: '#FDFAF6',
        surface: '#F5EFE6',
        'text-base': '#1A1208',
        'text-muted': '#6B5C4A',
        border: '#E2D5C3',
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
