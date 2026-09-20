/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#003F87',
        secondary: '#1B6D24',
        tertiary: '#88000E',
        background: '#F8F9FA'
      }
    },
  },
  plugins: [],
}
