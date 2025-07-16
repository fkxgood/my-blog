module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,svelte,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#00ff88',
        secondary: '#ff4757',
        accent: '#ffa502',
        dark: {
          900: '#0a0a0a',
          800: '#121212',
          700: '#1a1a1a',
          600: '#2d2d2d',
          500: '#3d3d3d',
        },
        neon: {
          green: '#00ff88',
          red: '#ff4757',
          blue: '#3742fa',
          purple: '#9c27b0',
          orange: '#ffa502',
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        slideUp: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        pulseNeon: {
          '0%': { 
            boxShadow: '0 0 5px #00ff88, 0 0 10px #00ff88',
          },
          '100%': { 
            boxShadow: '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88',
          }
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
      },
      typography: {
        invert: {
          css: {
            '--tw-prose-body': '#ffffff',
            '--tw-prose-headings': '#ffffff',
            '--tw-prose-lead': '#e5e5e5',
            '--tw-prose-links': '#00ff88',
            '--tw-prose-bold': '#ffffff',
            '--tw-prose-counters': '#cccccc',
            '--tw-prose-bullets': '#00ff88',
            '--tw-prose-hr': 'rgba(0, 255, 136, 0.3)',
            '--tw-prose-quotes': '#e5e5e5',
            '--tw-prose-quote-borders': '#00ff88',
            '--tw-prose-captions': '#cccccc',
            '--tw-prose-code': '#00ff88',
            '--tw-prose-pre-code': '#ffffff',
            '--tw-prose-pre-bg': '#0a0a0a',
            '--tw-prose-th-borders': 'rgba(0, 255, 136, 0.4)',
            '--tw-prose-td-borders': 'rgba(0, 255, 136, 0.3)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}; 