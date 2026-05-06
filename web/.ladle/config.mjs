/**
 * Ladle config — design hand-off for the Ayoitson brand primitives.
 *
 * Ladle is lighter than Storybook: ~3 dev deps, Vite-native, < 200ms cold start.
 * Stories live at web/src/stories/*.stories.tsx and import the primitives we
 * shipped under web/src/components/ayo/.
 *
 * Run:  npx ladle serve --config web/.ladle/config.mjs
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export default {
  stories: 'web/src/stories/**/*.stories.{ts,tsx}',
  defaultStory: 'overview--read-me',
  port: 61000,
  viteConfig: 'web/vite.config.ts',
};
