import type { GlobalProvider } from '@ladle/react';

import '@/styles/globals.css';

/**
 * Ladle global wrapper — pulls in the brand stylesheet so every story renders
 * with tokens applied. Uses brand classes only (no inline style attributes —
 * the frontend ESLint rule bans them in any production-adjacent code).
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export const Provider: GlobalProvider = ({ children }) => (
  <div className="bg-surface-page min-h-screen p-sp-5 text-text-primary">
    {children}
  </div>
);
