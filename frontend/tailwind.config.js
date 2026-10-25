/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f3f5f9',
          100: '#e3e8f0',
          200: '#c4cde0',
          300: '#98a7c6',
          400: '#667ca8',
          500: '#455d8c',
          600: '#354873',
          700: '#2c3b5e',
          800: '#1f2a44',
          900: '#141c30',
          950: '#0b1020',
        },
        accent: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};
