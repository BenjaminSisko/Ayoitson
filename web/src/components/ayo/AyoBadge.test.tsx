// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

import { AyoBadge } from './AyoBadge';

describe('<AyoBadge>', () => {
  test('renders the label and a leading icon for every tone', () => {
    const tones = [
      'neutral',
      'live',
      'scheduled',
      'past',
      'error',
      'warn',
      'success',
    ] as const;
    tones.forEach((tone) => {
      const { container, unmount } = render(
        <AyoBadge tone={tone}>{tone}</AyoBadge>
      );
      // text label is present (icon + label rule)
      expect(screen.getByText(tone)).toBeInTheDocument();
      // a leading svg icon is rendered (color is reinforcement, never the only signal)
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    });
  });

  test('explicit icon={null} omits the leading icon', () => {
    const { container } = render(
      <AyoBadge tone="live" icon={null}>
        live
      </AyoBadge>
    );
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('live')).toBeInTheDocument();
  });

  test('honors custom className', () => {
    const { container } = render(
      <AyoBadge tone="success" className="extra-test-class">
        ok
      </AyoBadge>
    );
    expect(container.firstChild).toHaveClass('extra-test-class');
  });
});
