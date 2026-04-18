import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-lexend)', 'sans-serif'],
        body: ['var(--font-lexend)', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5b9fc',
          400: '#8194f8',
          500: '#6470f1',
          600: '#4f52e6',
          700: '#4a6cf7',
          800: '#3535a3',
          900: '#2f3181',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease both',
        'fade-up': 'fadeUp 0.3s ease both',
        'slide-up': 'slideUp 0.2s ease',
        'spin-slow': 'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
    },
  },
  plugins: [],
}
export default config
