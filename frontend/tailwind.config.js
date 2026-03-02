/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#06060a',
          900: '#0a0a10',
          850: '#0e0e16',
          800: '#13131d',
          700: '#1a1a2e',
          600: '#232340',
          500: '#2d2d52',
        },
        aurora: {
          violet: '#8B5CF6',
          purple: '#A855F7',
          fuchsia: '#D946EF',
          rose: '#F43F5E',
          amber: '#F59E0B',
          teal: '#14B8A6',
          cyan: '#06B6D4',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(139, 92, 246, 0.3)',
        'glow-md': '0 0 30px -5px rgba(139, 92, 246, 0.4)',
        'glow-lg': '0 0 50px -10px rgba(139, 92, 246, 0.3)',
        'glow-violet': '0 0 40px -10px rgba(139, 92, 246, 0.5)',
        'glow-rose': '0 0 40px -10px rgba(244, 63, 94, 0.4)',
        'glow-amber': '0 0 40px -10px rgba(245, 158, 11, 0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}