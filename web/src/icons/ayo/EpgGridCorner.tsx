import type { SVGProps } from 'react';

/**
 * EPG grid corner — small 2x2 cell pattern echoing the program grid.
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export function EpgGridCorner(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="5" height="5" rx="0.75" />
      <rect x="9" y="2" width="5" height="5" rx="0.75" opacity="0.5" />
      <rect x="2" y="9" width="5" height="5" rx="0.75" opacity="0.5" />
      <rect x="9" y="9" width="5" height="5" rx="0.75" opacity="0.25" />
    </svg>
  );
}
