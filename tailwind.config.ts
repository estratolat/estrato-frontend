import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f0',
          100: '#fde1dd',
          200: '#fbc9c0',
          300: '#f7a295',
          400: '#f1705a',
          500: '#d73216',
          600: '#c42a12',
          700: '#a3210f',
          800: '#861d11',
          900: '#6f1b11',
          950: '#3c0a06',
        },
        secondary: {
          50: '#f4f4f6',
          100: '#e5e5e9',
          200: '#cecdd3',
          300: '#a8a7b1',
          400: '#7c7a88',
          500: '#5d5b6b',
          600: '#4f4d5b',
          700: '#383745',
          800: '#31303c',
          900: '#2b2a33',
          950: '#16151a',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        // Colores de semáforo para territorio
        semaforo: {
          rojo: '#ef4444',
          amarillo: '#eab308',
          verde: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['var(--font-alacrity)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
