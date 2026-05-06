import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '@/lib/cn';

export function Label({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-xs font-semibold uppercase tracking-wide', className)}
      {...props}
    />
  );
}
