import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Radio,
} from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

/**
 * <AyoBadge>
 *
 * Status pill — color is reinforcement, never the only signal: every variant
 * carries a leading icon and a text label.
 *
 * Variants per [[Design System - Ayoitson v1]] §"Status pills":
 *   - live      — on-air red, white text, leading filled-circle (use AyoLiveIndicator for the pulsing version)
 *   - scheduled — ink @ 60%, future program
 *   - past      — static gray, aired program
 *   - error     — error semantic
 *   - warn      — warning semantic
 *   - success   — success semantic
 *   - neutral   — surface-2 / muted text — default
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */

const ayoBadgeVariants = cva(
  cn(
    'inline-flex items-center gap-sp-1 px-sp-3 py-sp-1 rounded-full',
    'font-semibold text-12 leading-12 whitespace-nowrap',
    'border'
  ),
  {
    variants: {
      tone: {
        neutral: 'bg-surface-2 text-text-muted border-border-subtle',
        live: 'bg-ayo-on-air text-text-on-accent border-transparent',
        scheduled: 'bg-surface-2 text-text-primary/80 border-border-subtle',
        past: 'bg-surface-2 text-text-muted border-border-subtle',
        error:
          'bg-[color:var(--status-error)]/10 text-[color:var(--status-error)] border-[color:var(--status-error)]/30',
        warn: 'bg-[color:var(--status-warning)]/10 text-[color:var(--status-warning)] border-[color:var(--status-warning)]/30',
        success:
          'bg-[color:var(--status-success)]/10 text-[color:var(--status-success)] border-[color:var(--status-success)]/30',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }
);

const TONE_ICON = {
  neutral: Circle,
  live: Radio,
  scheduled: Calendar,
  past: Circle,
  error: AlertCircle,
  warn: AlertTriangle,
  success: CheckCircle2,
} as const;

export type AyoBadgeTone = keyof typeof TONE_ICON;

export interface AyoBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof ayoBadgeVariants> {
  /** Override the auto-selected leading icon. Pass `null` to omit. */
  icon?: React.ReactNode | null;
  children: React.ReactNode;
}

export function AyoBadge({
  tone = 'neutral',
  icon,
  className,
  children,
  ...rest
}: AyoBadgeProps) {
  const resolvedTone = (tone ?? 'neutral') as AyoBadgeTone;
  const Icon = TONE_ICON[resolvedTone];
  const leading =
    icon === null
      ? null
      : (icon ?? <Icon className="h-3 w-3" aria-hidden="true" />);

  return (
    <span className={cn(ayoBadgeVariants({ tone }), className)} {...rest}>
      {leading}
      <span>{children}</span>
    </span>
  );
}
