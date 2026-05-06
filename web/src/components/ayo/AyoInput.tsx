import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * <AyoInput>
 *
 * Form input with brand-correct focus ring (3px, --ayo-focus-ring).
 * Use with <AyoLabel> above, helper/error text below in --fs-12.
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export type AyoInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const AyoInput = React.forwardRef<HTMLInputElement, AyoInputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-9 w-full bg-surface-1 px-sp-3 text-14 text-text-primary',
        'rounded-2 border border-border-default',
        'placeholder:text-text-muted',
        'transition-colors duration-fast ease-soft',
        'focus:outline-none focus:border-ayo-on-air',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[color:var(--ayo-focus-ring)] focus-visible:outline-offset-2',
        'disabled:bg-surface-2 disabled:text-text-muted disabled:cursor-not-allowed',
        invalid &&
          'border-[color:var(--status-error)] focus:border-[color:var(--status-error)]',
        className
      )}
      {...props}
    />
  )
);
AyoInput.displayName = 'AyoInput';
