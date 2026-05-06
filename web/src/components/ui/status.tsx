import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/cn';

type StatusProps = {
  tone?: 'error' | 'success' | 'neutral';
  children: React.ReactNode;
};

export function Status({ tone = 'neutral', children }: StatusProps) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        tone === 'error' &&
          'border-danger/30 bg-danger/10 text-[hsl(var(--danger))]',
        tone === 'success' &&
          'border-primary/30 bg-primary/10 text-[hsl(var(--primary))]',
        tone === 'neutral' && 'border-border bg-muted text-muted-foreground'
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
