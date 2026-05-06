// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

import { AyoLiveIndicator } from './AyoLiveIndicator';

describe('<AyoLiveIndicator>', () => {
  test('renders the default brand label "Ayo! It\'s on."', () => {
    render(<AyoLiveIndicator />);
    expect(screen.getByText("Ayo! It's on.")).toBeInTheDocument();
  });

  test('exposes role=status with aria-live polite by default', () => {
    render(<AyoLiveIndicator />);
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
  });

  test('uses the .ayo-live-indicator class for the pulse keyframe', () => {
    render(<AyoLiveIndicator label="Live" />);
    const indicator = screen.getByText('Live').closest('span');
    expect(indicator).toHaveClass('ayo-live-indicator');
  });

  test('reduced-motion is honored at the CSS layer', () => {
    // The keyframe is canceled via @media (prefers-reduced-motion: reduce) in
    // styles/ayo.css. We assert the class hook is present so the CSS can engage.
    render(<AyoLiveIndicator />);
    const indicator = screen.getByRole('status');
    expect(indicator.className).toMatch(/ayo-live-indicator/);
  });

  test('custom label is rendered verbatim', () => {
    render(<AyoLiveIndicator label="Now playing" />);
    expect(screen.getByText('Now playing')).toBeInTheDocument();
  });
});
