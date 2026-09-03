/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        card: 'var(--surface-primary)',
        surface: {
          DEFAULT: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
        },
        border: {
          DEFAULT: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        primary: {
          DEFAULT: 'var(--accent-blue)',
          hover: 'var(--accent-blue)',
        },
        muted: 'var(--text-muted)',
        danger: {
          DEFAULT: 'var(--danger)',
          hover: 'var(--danger)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          hover: 'var(--warning)',
        },
        success: {
          DEFAULT: 'var(--success)',
          hover: 'var(--success)',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '10px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
