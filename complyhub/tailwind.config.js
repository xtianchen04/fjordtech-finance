/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1F33',
        deep: '#13314F',
        steel: '#2E6CA4',
        sky: '#5AA0DC',
        mist: '#E8F1F8',
        paper: '#F7FAFC',
        gold: '#C99A3B',
        ok: '#2E9E6B',
        amber: '#E0A030',
        danger: '#D1495B',
        line: '#D7E3EE',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
