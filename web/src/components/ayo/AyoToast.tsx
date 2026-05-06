import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * <AyoToast> + <AyoToastViewport> + useAyoToast()
 *
 * Bottom-right notifications per [[Design System - Ayoitson v1]] §"Toasts".
 * Default dismiss: 4s success/info, 8s warn, persist on error.
 * Slide-in via .ayo-toast keyframe (in styles/ayo.css), respects reduced motion.
 *
 * Custom (not Sonner) to keep the runtime dep set minimal — bundle is < 1 KB.
 *
 * Usage:
 *   const { toast, ToastViewport } = useAyoToast();
 *   toast({ title: 'Saved.', tone: 'success' });
 *   <ToastViewport />  // mount once near the app root
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */

export type AyoToastTone = 'info' | 'success' | 'warn' | 'error';

export interface AyoToastInput {
  id?: string;
  title: string;
  description?: string;
  tone?: AyoToastTone;
  /** Override default duration in ms; pass 0 to persist. */
  duration?: number;
}

interface InternalToast extends Required<Omit<AyoToastInput, 'description'>> {
  description?: string;
}

const DEFAULT_DURATIONS: Record<AyoToastTone, number> = {
  info: 4000,
  success: 4000,
  warn: 8000,
  error: 0,
};

const TONE_ICON = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: AlertCircle,
} as const;

let counter = 0;

export function useAyoToast() {
  const [toasts, setToasts] = React.useState<InternalToast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((input: AyoToastInput) => {
    const tone = input.tone ?? 'info';
    const id = input.id ?? `ayo-toast-${++counter}`;
    const duration = input.duration ?? DEFAULT_DURATIONS[tone];
    setToasts((current) => [
      ...current,
      {
        id,
        title: input.title,
        description: input.description,
        tone,
        duration,
      },
    ]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const ToastViewport = React.useCallback(
    () => <AyoToastViewport toasts={toasts} onDismiss={dismiss} />,
    [toasts, dismiss]
  );

  return { toast, dismiss, ToastViewport, toasts };
}

interface AyoToastViewportProps {
  toasts: InternalToast[];
  onDismiss: (id: string) => void;
}

export function AyoToastViewport({ toasts, onDismiss }: AyoToastViewportProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-sp-4 right-sp-4 z-50 flex flex-col gap-sp-3"
    >
      {toasts.map((t) => (
        <AyoToast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

interface AyoToastProps {
  toast: InternalToast;
  onDismiss: () => void;
}

export function AyoToast({ toast, onDismiss }: AyoToastProps) {
  const Icon = TONE_ICON[toast.tone];
  const live = toast.tone === 'error' ? 'assertive' : 'polite';
  return (
    <div
      role="status"
      aria-live={live}
      className={cn(
        'ayo-toast',
        'flex min-w-[280px] max-w-sm items-start gap-sp-3 rounded-3 px-sp-4 py-sp-3 shadow-2',
        'bg-surface-1 text-text-primary border',
        toast.tone === 'success' && 'border-[color:var(--status-success)]/40',
        toast.tone === 'warn' && 'border-[color:var(--status-warning)]/40',
        toast.tone === 'error' && 'border-[color:var(--status-error)]/40',
        toast.tone === 'info' && 'border-border-subtle'
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          toast.tone === 'success' && 'text-[color:var(--status-success)]',
          toast.tone === 'warn' && 'text-[color:var(--status-warning)]',
          toast.tone === 'error' && 'text-[color:var(--status-error)]',
          toast.tone === 'info' && 'text-text-muted'
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-14 font-semibold">{toast.title}</p>
        {toast.description ? (
          <p className="mt-sp-1 text-13 text-text-muted">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ayo-focus shrink-0 rounded-1 p-sp-1 text-text-muted hover:text-text-primary"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
