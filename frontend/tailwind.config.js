/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FAF6EF',
        paper: '#FFFFFF',
        sand: '#EDE6D8',
        ink: '#1F1A14',
        terracotta: '#B8462A',
        sage: '#3D5A3A',
        rust: '#A8341F',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['"Inter Tight Variable"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        paper: '0 1px 0 rgba(31, 26, 20, 0.05) inset, 0 1px 2px rgba(31, 26, 20, 0.06), 0 8px 24px -12px rgba(31, 26, 20, 0.12)',
        soft: '0 1px 2px rgba(31, 26, 20, 0.05), 0 2px 8px -4px rgba(31, 26, 20, 0.08)',
      }
    },
  },
  plugins: [],
}
