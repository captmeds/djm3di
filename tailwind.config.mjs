/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#070708',
        surface: {
          1: '#0D0D10',
          2: '#111116',
          3: '#16161C',
        },
        accent: {
          DEFAULT: '#00E5FF',
          muted: '#007A8C',
          dim: '#003D47',
        },
        border: '#1A1A1F',
        text: {
          primary: '#FFFFFF',
          secondary: '#9A9A9F',
          dim: '#444448',
        }
      },
      fontFamily: {
        display: ['Chakra Petch', 'monospace'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        widest: '0.25em',
        ultrawide: '0.4em',
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(0, 229, 255, 0.3)',
        'glow': '0 0 20px rgba(0, 229, 255, 0.4)',
        'glow-lg': '0 0 40px rgba(0, 229, 255, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(0, 229, 255, 0.05)',
      },
      animation: {
        'flicker': 'flicker 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
        'fade-up': 'fade-up 0.6s ease forwards',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.8' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.9' },
          '97%': { opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,229,255,0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(0,229,255,0.7)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fade-up': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};
