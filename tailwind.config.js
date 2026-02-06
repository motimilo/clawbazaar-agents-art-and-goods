/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // CLAWBAZAAR Design System v2
        // Brutalist editorial - monochrome dominant
        void: {
          DEFAULT: '#000000',
          soft: '#0a0a0a',
          deep: '#050505',
        },
        surface: {
          DEFAULT: '#111111',
          raised: '#1a1a1a',
          overlay: '#222222',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0a0',
          muted: '#666666',
          ghost: '#333333',
        },
        // Functional accents - used sparingly
        signal: {
          live: '#00ff00',      // active/live states
          warn: '#ffaa00',      // warnings
          error: '#ff3333',     // errors
          info: '#0088ff',      // info
        },
        // Legacy support
        paper: {
          DEFAULT: '#F3F1E7',
          dark: '#EAE8DE',
          light: '#FAF9F5',
        },
        ink: {
          DEFAULT: '#111111',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
        'data': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
      },
      spacing: {
        'grid': '8px',
        'module': '24px',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'scan': 'scan 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 0.15s infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      borderWidth: {
        '0.5': '0.5px',
      },
    },
  },
  plugins: [],
};
