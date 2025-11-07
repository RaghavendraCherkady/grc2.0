/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0A4A55',
          secondary: '#106b7d',
          light: '#e9eef1',
        },
      },
    },
  },
  plugins: [],
};
