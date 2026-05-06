import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

/**
 * <AyoButton>
 *
 * Variants per [[Design System - Ayoitson v1]] §Buttons:
 *   - primary: ink bg / cream text — the page CTA (max one per page)
 *   - accent:  on-air red bg / white text — destructive or live actions
 *   - secondary: surface-1 bg with border — common actions
 *   - ghost:   transparent with border — toolbar / inline-row
 *   - link:    transparent with on-air red text — inline navigation
 *
 * Sizes:
 *   - default: padding sp-3/sp-4 (12/16)
 *   - compact: padding sp-2/sp-3 (8/12)
 *   - icon:    square 36×36
 *
 * Focus ring: 3px var(--ayo-focus-ring) outside the button.
 * Motion: var(--ease-snap), var(--dur-fast).
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */

const ayoButtonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-sp-2 whitespace-nowrap rounded-2',
    'font-medium select-none',
    'transition-colors duration-fast ease-snap',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[color:var(--ayo-focus-ring)] focus-visible:outline-offset-2'
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-ayo-ink text-ayo-cream hover:bg-ayo-graphite-2 active:bg-ayo-graphite border border-transparent',
        accent:
          'bg-ayo-on-air text-text-on-accent hover:bg-ayo-on-air-dim active:bg-ayo-on-air-dim border border-transparent',
        secondary:
          'bg-surface-1 text-text-primary border border-border-default hover:bg-surface-2',
        ghost:
          'bg-transparent text-text-primary border border-border-default hover:bg-surface-1',
        link: 'bg-transparent text-accent hover:text-accent-dim underline-offset-4 hover:underline border border-transparent',
      },
      size: {
        default: 'h-9 text-14 px-sp-4 py-sp-3',
        compact: 'h-8 text-13 px-sp-3 py-sp-2',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  }
);

export type AyoButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof ayoButtonVariants> & {
    asChild?: boolean;
  };

export const AyoButton = React.forwardRef<HTMLButtonElement, AyoButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        // <button> defaults to type="submit" inside a form — avoid surprises.
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(ayoButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
AyoButton.displayName = 'AyoButton';

export { ayoButtonVariants };
