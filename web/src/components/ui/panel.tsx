import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type PanelProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: PanelProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-surface shadow-panel',
        className
      )}
    >
      {(title || description || action) && (
        <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
