import type { SVGProps } from 'react';

/**
 * Filled "rec" dot — used inside the live-indicator and as the now-line marker.
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export function RecDot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="8" r="4" />
    </svg>
  );
}
