/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf6ec',
          100: '#f8e8cf',
          200: '#efc98a',
          300: '#e2a94f',
          400: '#c9832c',
          500: '#a8631f',
          600: '#7f4a18',
          700: '#5c3613',
          800: '#3c230d',
          900: '#241507',
        },
      },
    },
  },
  plugins: [],
};
