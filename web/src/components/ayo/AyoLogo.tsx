import * as React from 'react';

import { cn } from '@/lib/cn';

const logoTransparentUrl = '/logo-transparent.png';
const logoUrl = '/logo.png';

/**
 * <AyoLogo>
 *
 * Wordmark lockup. Renders the production logo PNG from /logo.png (light bg)
 * or /logo-transparent.png (transparent / icon-only).
 *
 * Props:
 *   - size:    'sm' | 'md' | 'lg' | 'xl'
 *   - mode:    'light' | 'dark' | 'auto' — controls which asset variant
 *   - variant: 'full' | 'icon-only'
 *
 * The "auto" mode resolves at render time based on `[data-theme]` /
 * `prefers-color-scheme` via CSS, by always serving the transparent PNG and
 * letting the surface behind it provide the cream/graphite background.
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */
export type AyoLogoSize = 'sm' | 'md' | 'lg' | 'xl';
export type AyoLogoMode = 'light' | 'dark' | 'auto';
export type AyoLogoVariant = 'full' | 'icon-only';

export interface AyoLogoProps {
  size?: AyoLogoSize;
  mode?: AyoLogoMode;
  variant?: AyoLogoVariant;
  className?: string;
  /** Override the rendered alt text. Default: "Ayo! It's On" / 'Ayoitson icon'. */
  alt?: string;
}

const SIZE_CLASS: Record<AyoLogoSize, string> = {
  sm: 'h-6',
  md: 'h-9',
  lg: 'h-12',
  xl: 'h-16',
};

const ICON_SIZE_CLASS: Record<AyoLogoSize, string> = {
  sm: 'h-6 w-6',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function AyoLogo({
  size = 'md',
  mode = 'auto',
  variant = 'full',
  className,
  alt,
}: AyoLogoProps) {
  // For 'light' we serve the cream-bg version; for 'dark' or 'auto' we serve
  // the transparent — surface beneath it provides the right background.
  const src = mode === 'light' ? logoUrl : logoTransparentUrl;
  const altText =
    alt ?? (variant === 'icon-only' ? 'Ayoitson icon' : "Ayo! It's On");
  const sizeClass =
    variant === 'icon-only' ? ICON_SIZE_CLASS[size] : SIZE_CLASS[size];

  return (
    <img
      src={src}
      alt={altText}
      className={cn(
        'select-none',
        sizeClass,
        variant === 'icon-only' ? 'object-cover' : 'object-contain',
        className
      )}
      draggable={false}
    />
  );
}
