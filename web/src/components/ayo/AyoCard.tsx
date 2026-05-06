import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * <AyoCard>
 *
 * Surface-1 background, hairline ring (--shadow-0), padding sp-5.
 * Composed via dot-namespaced subcomponents (Header / Body / Footer).
 *
 * Channel surfaces should override `radius="tv"` to echo the CRT.
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */

type Radius = 'card' | 'tv';
type AsProp = 'div' | 'section' | 'article';

export interface AyoCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: AsProp;
  radius?: Radius;
  interactive?: boolean;
}

function CardRoot({
  as = 'section',
  radius = 'card',
  interactive = false,
  className,
  children,
  ...props
}: AyoCardProps) {
  const Comp = as;
  return (
    <Comp
      className={cn(
        'bg-surface-1 shadow-0',
        radius === 'tv' ? 'rounded-tv' : 'rounded-3',
        interactive &&
          'cursor-pointer transition-shadow duration-fast ease-snap hover:shadow-1',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

interface SubProps extends React.HTMLAttributes<HTMLDivElement> {}

function CardHeader({ className, children, ...rest }: SubProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-sp-2 px-sp-5 pt-sp-4 pb-sp-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function CardBody({ className, children, ...rest }: SubProps) {
  return (
    <div className={cn('px-sp-5 py-sp-4', className)} {...rest}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...rest }: SubProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-sp-3 border-t border-border-subtle px-sp-5 py-sp-3',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h2' | 'h3' | 'h4';
}

function CardTitle({ as = 'h3', className, children, ...rest }: TitleProps) {
  const Comp = as;
  return (
    <Comp className={cn('text-18', className)} {...rest}>
      {children}
    </Comp>
  );
}

function CardDescription({ className, children, ...rest }: SubProps) {
  return (
    <p className={cn('text-14 text-text-muted', className)} {...rest}>
      {children}
    </p>
  );
}

export const AyoCard = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Body: CardBody,
  Footer: CardFooter,
});
