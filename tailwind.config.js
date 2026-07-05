/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-reactive: these read from CSS custom properties defined in
        // index.css, redefined under body.theme-light — so bg-void/text-ink
        // etc. automatically adapt to the active theme everywhere they're
        // used, with no per-component dark:/light: class needed.
        void: {
          DEFAULT: 'rgb(var(--void) / <alpha-value>)',
          panel: 'rgb(var(--void-panel) / <alpha-value>)',
          raised: 'rgb(var(--void-raised) / <alpha-value>)',
          line: 'rgb(var(--void-line) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          dim: 'rgb(var(--ink-dim) / <alpha-value>)',
        },
        // Static, NOT theme-reactive: always near-black, used specifically
        // for icon/text placed on top of bright amber/teal accent buttons,
        // which need dark contrast regardless of the active page theme.
        obsidian: '#0C0E11',
        amber: {
          DEFAULT: '#E8A33D',
          soft: '#F0C07A',
          deep: '#C77E1F',
        },
        teal: {
          DEFAULT: '#3FE8C9',
          soft: '#8FF2DC',
          deep: '#1FAE95',
        },
        clip: {
          DEFAULT: '#E8473D',
          soft: '#F28079',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.35)',
        'glow-amber': '0 0 24px rgba(232,163,61,0.35)',
        'glow-teal': '0 0 24px rgba(63,232,201,0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        meterPulse: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanline: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        meterPulse: 'meterPulse 1.2s ease-in-out infinite',
        fadeUp: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        scanline: 'scanline 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};
