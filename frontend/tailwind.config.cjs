/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'thunder-navy': '#095668',
        'thunder-dark': '#074353',
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
};