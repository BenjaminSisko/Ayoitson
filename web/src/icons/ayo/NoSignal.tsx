import type { SVGProps } from 'react';

/**
 * Mini CRT with "no signal" static — empty-state illustration.
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export function NoSignal(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 96 64"
      width="6em"
      height="4em"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {/* CRT body */}
      <rect
        x="6"
        y="6"
        width="84"
        height="52"
        rx="10"
        fill="currentColor"
        opacity="0.08"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {/* Static lines */}
      <g
        opacity="0.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <line x1="14" y1="18" x2="34" y2="18" />
        <line x1="40" y1="18" x2="60" y2="18" />
        <line x1="66" y1="18" x2="82" y2="18" />
        <line x1="14" y1="26" x2="22" y2="26" />
        <line x1="28" y1="26" x2="50" y2="26" />
        <line x1="56" y1="26" x2="80" y2="26" />
        <line x1="14" y1="34" x2="40" y2="34" />
        <line x1="46" y1="34" x2="58" y2="34" />
        <line x1="64" y1="34" x2="82" y2="34" />
        <line x1="14" y1="42" x2="30" y2="42" />
        <line x1="36" y1="42" x2="52" y2="42" />
        <line x1="58" y1="42" x2="76" y2="42" />
      </g>
      {/* Antenna */}
      <path
        d="M40 6 L48 -2 L56 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
