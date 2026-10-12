/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'], // Use default sans
      },
      colors: {
        primary: '#4f46e5', // Indigo
        secondary: '#6366f1', // Indigo-500
      },
    },
  },
  plugins: [],
};
