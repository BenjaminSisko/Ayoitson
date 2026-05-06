import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * <AyoCheckbox>
 *
 * Native checkbox with brand-correct focus ring. Pair with a <label>:
 *   <label className="flex items-center gap-sp-2">
 *     <AyoCheckbox checked={...} onChange={...} />
 *     Auto refresh guide
 *   </label>
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export type AyoCheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

export const AyoCheckbox = React.forwardRef<HTMLInputElement, AyoCheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded-1 border border-border-default',
        'text-ayo-on-air accent-[color:var(--ayo-on-air)]',
        'focus:outline-none',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[color:var(--ayo-focus-ring)] focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
AyoCheckbox.displayName = 'AyoCheckbox';
