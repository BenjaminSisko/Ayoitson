import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * <AyoSelect>
 *
 * Native <select> wrapper with brand styling. We deliberately stay native
 * (vs Radix Select) for v1: native select beats custom for accessibility,
 * performance, and air-gap UX (long lists scroll; mobile gets the OS picker).
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export type AyoSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const AyoSelect = React.forwardRef<HTMLSelectElement, AyoSelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-9 w-full bg-surface-1 px-sp-3 text-14 text-text-primary',
        'rounded-2 border border-border-default',
        'transition-colors duration-fast ease-soft',
        'focus:outline-none focus:border-ayo-on-air',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[color:var(--ayo-focus-ring)] focus-visible:outline-offset-2',
        'disabled:bg-surface-2 disabled:text-text-muted disabled:cursor-not-allowed',
        invalid &&
          'border-[color:var(--status-error)] focus:border-[color:var(--status-error)]',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
AyoSelect.displayName = 'AyoSelect';
