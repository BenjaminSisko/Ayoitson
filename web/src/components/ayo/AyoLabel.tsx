import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '@/lib/cn';

/**
 * <AyoLabel>
 *
 * Form field label — sits above the input (never beside) per
 * [[Design System - Ayoitson v1]] §"Settings layout".
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export const AyoLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-13 font-semibold text-text-primary', className)}
    {...props}
  />
));
AyoLabel.displayName = 'AyoLabel';
