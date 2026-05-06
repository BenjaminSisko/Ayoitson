import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * <AyoLiveIndicator>
 *
 * The pulsing "On Air" pill — the one place subtle motion lives in the brand.
 * 1.5s loop, 4% opacity oscillation, completely silenced under reduced motion
 * (handled by .ayo-live-indicator CSS — see styles/ayo.css).
 *
 * Reuse anywhere a channel is currently airing. Default label is "Ayo! It's on."
 * per [[Design System - Ayoitson v1]] §Voice — use it sparingly.
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export interface AyoLiveIndicatorProps {
  label?: string;
  className?: string;
  /** ARIA live region politeness. Defaults to "polite" — set "off" if rendered statically. */
  ariaLive?: 'polite' | 'assertive' | 'off';
}

export function AyoLiveIndicator({
  label = "Ayo! It's on.",
  className,
  ariaLive = 'polite',
}: AyoLiveIndicatorProps) {
  return (
    <span
      role="status"
      aria-live={ariaLive}
      data-testid="ayo-live-indicator"
      className={cn('ayo-live-indicator', className)}
    >
      <span className="ayo-live-indicator__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
