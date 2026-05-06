/**
 * Stories — overview & design hand-off for the Ayo* brand primitives.
 *
 * Run with:  npx ladle serve --config web/.ladle/config.mjs
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
import { AyoLogo } from '@/components/ayo';

export const ReadMe = () => (
  <div className="mx-auto flex max-w-3xl flex-col gap-sp-5">
    <AyoLogo size="lg" />
    <h1 className="text-display-lg font-display">
      Ayoitson — Design System v1
    </h1>
    <p className="text-16">
      This Ladle workspace is the design hand-off for the brand primitives that
      ship in <span className="font-mono">web/src/components/ayo/</span>. Phase
      5 screens consume these — never raw Tailwind utilities or direct shadcn
      imports outside this wrapper layer.
    </p>
    <p className="text-14 text-text-muted">
      The design contract is the &ldquo;Design System — Ayoitson v1&rdquo; doc
      in the Obsidian vault. Tokens live in
      <span className="font-mono"> web/src/styles/tokens.css</span>. Tailwind
      reads from those tokens via <span className="font-mono">var(--*)</span>.
    </p>
  </div>
);
ReadMe.storyName = 'Read me';

export default {
  title: 'Overview',
};
