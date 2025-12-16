import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'thunder-navy': '#1e3a5f',
        'thunder-dark': '#2d5a8c',
        'thunder-gold': '#ffb020',
        'thunder-orange': '#ff922b',
        'thunder-yellow': '#ffd24a',
        'thunder-light': '#f0f0f0',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
