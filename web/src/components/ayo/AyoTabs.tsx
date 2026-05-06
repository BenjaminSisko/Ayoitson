import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/cn';

/**
 * <AyoTabs>
 *
 * WAI-ARIA tablist with arrow-key nav (handled by Radix).
 *
 * **Constant font weight between active/inactive** to avoid the layout-shift
 * bug seen on FilterChip-as-tab patterns. Active state is signaled by the
 * underline indicator + text-primary color, *not* by a weight bump.
 *
 * Use AyoBadge or filter chips for actual filter UI; tabs are for navigation.
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */

export const AyoTabs = TabsPrimitive.Root;

export const AyoTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-sp-1 border-b border-border-subtle',
      className
    )}
    {...props}
  />
));
AyoTabsList.displayName = 'AyoTabsList';

export const AyoTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Constant font weight + size — only color and underline change.
      'inline-flex items-center gap-sp-2 px-sp-3 py-sp-2 text-13 font-semibold',
      'text-text-muted hover:text-text-primary transition-colors duration-fast ease-soft',
      'border-b-2 border-transparent -mb-px',
      'focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[color:var(--ayo-focus-ring)] focus-visible:outline-offset-2',
      'data-[state=active]:text-text-primary data-[state=active]:border-ayo-on-air',
      className
    )}
    {...props}
  />
));
AyoTabsTrigger.displayName = 'AyoTabsTrigger';

export const AyoTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-sp-5 outline-none', className)}
    {...props}
  />
));
AyoTabsContent.displayName = 'AyoTabsContent';
