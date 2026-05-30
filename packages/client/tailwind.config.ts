import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        card: 'var(--card)',
        foreground: 'var(--foreground)',
        'foreground-muted': 'var(--foreground-muted)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        destructive: 'var(--destructive)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        border: 'var(--border)',
        muted: 'var(--foreground-muted)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        dialog: 'var(--shadow-dialog)',
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          '"Helvetica Neue"',
          'helvetica',
          'arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      letterSpacing: {
        button: '1.4px',
      },
    },
  },
  plugins: [],
};

export default config;
