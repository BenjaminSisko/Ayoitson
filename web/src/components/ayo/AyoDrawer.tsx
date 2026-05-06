import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { AyoButton } from './AyoButton';

/**
 * <AyoDrawer>
 *
 * Right-edge slide-over per [[Design System - Ayoitson v1]] §"Drawer / slide-over".
 * Width: min(560px, 100vw). Built on Radix Dialog so focus-trap, ESC, and
 * body-scroll-lock come for free; backdrop-click also dismisses.
 *
 * Animation classes (.ayo-drawer-*) are defined in styles/ayo.css and respect
 * prefers-reduced-motion.
 *
 * Usage:
 *   <AyoDrawer open={open} onOpenChange={setOpen} title="Program detail">
 *     <body content />
 *   </AyoDrawer>
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */

export interface AyoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Hide the close (X) button in the header. Defaults to false. */
  hideCloseButton?: boolean;
}

export function AyoDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  hideCloseButton = false,
}: AyoDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ayo-drawer-backdrop" />
        <DialogPrimitive.Content
          className={cn('ayo-drawer-panel', 'text-text-primary')}
          aria-describedby={description ? undefined : undefined}
        >
          <header className="flex items-start justify-between gap-sp-3 border-b border-border-subtle px-sp-5 py-sp-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-18 font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-sp-1 text-14 text-text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            {!hideCloseButton ? (
              <DialogPrimitive.Close asChild>
                <AyoButton
                  variant="ghost"
                  size="icon"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </AyoButton>
              </DialogPrimitive.Close>
            ) : null}
          </header>

          <div className="flex-1 overflow-y-auto px-sp-5 py-sp-5">
            {children}
          </div>

          {footer ? (
            <footer className="flex items-center justify-end gap-sp-3 border-t border-border-subtle px-sp-5 py-sp-3">
              {footer}
            </footer>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
