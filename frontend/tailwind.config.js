/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          app: '#000000',
          secondary: '#121212',
          sidebar: '#0A0A0A',
          card: '#171717',
          elevated: '#1F1F1F',
          dark: '#FFFFFF',          // Primary text is White #FFFFFF
          text: '#FFFFFF',
          'text-secondary': '#D4D4D4',
          'text-muted': '#A3A3A3',
          gray: '#D4D4D4',          // Secondary text Light Grey
          muted: '#A3A3A3',         // Muted text
          border: '#333333',        // Borders and dividers #333333
          'border-strong': '#404040',
          'border-subtle': '#262626',
          'border-input': '#404040',
          subtle: '#121212',
          placeholder: '#737373',
          white: '#FFFFFF',
        },
        traffic: {
          low: '#4D8B67',       // Muted green
          medium: '#C49A42',    // Muted amber
          high: '#C45B5B',      // Muted red
          critical: '#DC4545',  // Deep restrained red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace']
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'modal': '0 16px 32px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px #333333',
      }
    },
  },
  plugins: [],
}
