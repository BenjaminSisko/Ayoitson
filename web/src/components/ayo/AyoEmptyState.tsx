import * as React from 'react';

import { cn } from '@/lib/cn';
import { NoSignal } from '@/icons/ayo';

/**
 * <AyoEmptyState>
 *
 * Centered, max-width 480px, padding sp-7 per [[Design System - Ayoitson v1]]
 * §"Empty states". Default illustration is the CRT no-signal SVG; override by
 * passing `illustration`.
 *
 * Voice rule: acknowledge absence ("No channels yet. Make one.") — do not
 * say "Welcome to Ayoitson! Get started by..."
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export interface AyoEmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  illustration?: React.ReactNode;
  className?: string;
}

export function AyoEmptyState({
  title,
  description,
  action,
  illustration,
  className,
}: AyoEmptyStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-[480px] flex-col items-center gap-sp-3 p-sp-7 text-center',
        className
      )}
    >
      <div className="text-text-muted" aria-hidden="true">
        {illustration ?? <NoSignal />}
      </div>
      <h3 className="text-18 font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="text-14 text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-sp-2">{action}</div> : null}
    </div>
  );
}
