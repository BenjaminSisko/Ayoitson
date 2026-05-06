import type { Config } from 'tailwindcss';

/**
 * Tailwind theme is a thin reflection of the brand tokens defined in
 * web/src/styles/tokens.css. Every value here is `var(--*)` — never duplicate
 * the literal. The Design System doc is the single source of truth.
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export default {
  content: ['./web/index.html', './web/src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Core brand
        'ayo-ink': 'var(--ayo-ink)',
        'ayo-cream': 'var(--ayo-cream)',
        'ayo-cream-warm': 'var(--ayo-cream-warm)',
        'ayo-cream-cool': 'var(--ayo-cream-cool)',
        'ayo-on-air': 'var(--ayo-on-air)',
        'ayo-on-air-dim': 'var(--ayo-on-air-dim)',
        'ayo-static': 'var(--ayo-static)',
        'ayo-graphite': 'var(--ayo-graphite)',
        'ayo-graphite-2': 'var(--ayo-graphite-2)',

        // Semantic surfaces
        'surface-page': 'var(--surface-page)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'text-on-accent': 'var(--text-on-accent)',
        accent: 'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',

        // Status semantics
        'status-live': 'var(--status-live)',
        'status-scheduled': 'var(--status-scheduled)',
        'status-past': 'var(--status-past)',
        'status-error': 'var(--status-error)',
        'status-warning': 'var(--status-warning)',
        'status-success': 'var(--status-success)',

        // ----- Backwards-compatible mappings for the Phase 4 scaffold -----
        // The legacy shadcn primitives use `border`, `background`, `foreground`,
        // `muted`, `surface`, `primary`, `danger`. We point those at the brand
        // tokens so the unmodified primitives still render under the new theme.
        border: 'var(--border-default)',
        background: 'var(--surface-page)',
        foreground: 'var(--text-primary)',
        muted: 'var(--surface-2)',
        'muted-foreground': 'var(--text-muted)',
        surface: 'var(--surface-1)',
        primary: 'var(--ayo-ink)',
        'primary-foreground': 'var(--ayo-cream)',
        danger: 'var(--status-error)',
      },
      fontFamily: {
        display: 'var(--ff-display)',
        sans: 'var(--ff-body)',
        mono: 'var(--ff-mono)',
      },
      fontSize: {
        'display-xl': [
          'var(--fs-display-xl)',
          {
            lineHeight: 'var(--lh-display-xl)',
            fontWeight: 'var(--fw-display-xl)',
          },
        ],
        'display-lg': [
          'var(--fs-display-lg)',
          {
            lineHeight: 'var(--lh-display-lg)',
            fontWeight: 'var(--fw-display-lg)',
          },
        ],
        display: [
          'var(--fs-display)',
          { lineHeight: 'var(--lh-display)', fontWeight: 'var(--fw-display)' },
        ],
        '22': [
          'var(--fs-22)',
          { lineHeight: 'var(--lh-22)', fontWeight: 'var(--fw-22)' },
        ],
        '18': [
          'var(--fs-18)',
          { lineHeight: 'var(--lh-18)', fontWeight: 'var(--fw-18)' },
        ],
        '16': [
          'var(--fs-16)',
          { lineHeight: 'var(--lh-16)', fontWeight: 'var(--fw-16)' },
        ],
        '14': [
          'var(--fs-14)',
          { lineHeight: 'var(--lh-14)', fontWeight: 'var(--fw-14)' },
        ],
        '13': [
          'var(--fs-13)',
          { lineHeight: 'var(--lh-13)', fontWeight: 'var(--fw-13)' },
        ],
        '12': [
          'var(--fs-12)',
          { lineHeight: 'var(--lh-12)', fontWeight: 'var(--fw-12)' },
        ],
        '11': [
          'var(--fs-11)',
          { lineHeight: 'var(--lh-11)', fontWeight: 'var(--fw-11)' },
        ],
      },
      spacing: {
        'sp-0': 'var(--sp-0)',
        'sp-1': 'var(--sp-1)',
        'sp-2': 'var(--sp-2)',
        'sp-3': 'var(--sp-3)',
        'sp-4': 'var(--sp-4)',
        'sp-5': 'var(--sp-5)',
        'sp-6': 'var(--sp-6)',
        'sp-7': 'var(--sp-7)',
        'sp-8': 'var(--sp-8)',
        'sp-9': 'var(--sp-9)',
        'sp-10': 'var(--sp-10)',
      },
      borderRadius: {
        '0': 'var(--rad-0)',
        '1': 'var(--rad-1)',
        '2': 'var(--rad-2)',
        '3': 'var(--rad-3)',
        '4': 'var(--rad-4)',
        '5': 'var(--rad-5)',
        tv: 'var(--rad-tv)',
        full: 'var(--rad-full)',
      },
      boxShadow: {
        '0': 'var(--shadow-0)',
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        'tv-glow': 'var(--shadow-tv-glow)',
        // Legacy alias for existing scaffold (Panel uses shadow-panel)
        panel: 'var(--shadow-1)',
      },
      transitionTimingFunction: {
        snap: 'var(--ease-snap)',
        soft: 'var(--ease-soft)',
      },
      transitionDuration: {
        flash: 'var(--dur-flash)',
        fast: 'var(--dur-fast)',
        snap: 'var(--dur-snap)',
        settle: 'var(--dur-settle)',
      },
    },
  },
  plugins: [],
} satisfies Config;
