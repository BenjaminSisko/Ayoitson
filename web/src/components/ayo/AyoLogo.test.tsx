// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

import { AyoLogo } from './AyoLogo';

describe('<AyoLogo>', () => {
  test('default render uses transparent variant and full alt text', () => {
    render(<AyoLogo />);
    const img = screen.getByAltText("Ayo! It's On") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toMatch(/logo-transparent\.png$/);
  });

  test('mode="light" uses the cream-bg PNG', () => {
    render(<AyoLogo mode="light" />);
    const img = screen.getByAltText("Ayo! It's On") as HTMLImageElement;
    expect(img.src).toMatch(/\/logo\.png$/);
  });

  test('icon-only variant uses square sizing', () => {
    render(<AyoLogo variant="icon-only" size="sm" />);
    const img = screen.getByAltText('Ayoitson icon');
    expect(img.className).toMatch(/h-6 w-6/);
  });

  test('custom alt overrides default', () => {
    render(<AyoLogo alt="branding mark" />);
    expect(screen.getByAltText('branding mark')).toBeInTheDocument();
  });
});
