// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#ea580c',
          mid:     '#f97316',
          lite:    '#fdba74',
          pale:    '#fff7ed',
        },
        dark: {
          DEFAULT: '#0f0d0b',
          mid:     '#1a1612',
          pale:    '#241f1a',
        },
        stone: {
          mid:  '#a8a29e',
          lite: '#e7e5e4',
          pale: '#fafaf9',
        },
        cream: '#fdf8f3',
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        sans:     ['"DM Sans"', 'sans-serif'],
        mono:     ['"DM Mono"', 'monospace'],
      },
      fontSize: {
        '10': '10px',
        '11': '11px',
      },
    },
  },
  plugins: [],
}
