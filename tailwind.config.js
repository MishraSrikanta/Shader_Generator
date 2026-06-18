/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        panel: '#12121a',
        panel2: '#1a1a26',
        edge: '#262633',
        accent: '#7c5cff',
        accent2: '#22d3ee',
        muted: '#8b8b9e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(124,92,255,0.5)',
      },
    },
  },
  plugins: [],
}
