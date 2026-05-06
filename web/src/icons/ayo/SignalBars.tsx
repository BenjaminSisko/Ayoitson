import type { SVGProps } from 'react';

/**
 * CRT signal bars — three rising rectangles. Used in connection-status badges
 * and the channel-strength indicator.
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export function SignalBars(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="10" width="2.5" height="4" rx="0.5" />
      <rect x="6.75" y="6" width="2.5" height="8" rx="0.5" />
      <rect x="11.5" y="2" width="2.5" height="12" rx="0.5" />
    </svg>
  );
}
