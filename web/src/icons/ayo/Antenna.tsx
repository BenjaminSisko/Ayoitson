import type { SVGProps } from 'react';

/**
 * Antenna — V-shaped rabbit-ears motif from the logo lockup.
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export function Antenna(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 2 L8 8 L13 2" />
      <line x1="8" y1="8" x2="8" y2="13" />
      <circle cx="8" cy="14" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
