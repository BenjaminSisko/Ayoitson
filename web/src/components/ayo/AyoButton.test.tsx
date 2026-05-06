// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AyoButton } from './AyoButton';

describe('<AyoButton>', () => {
  test('renders each variant with the right base classes', () => {
    const variants = [
      'primary',
      'accent',
      'secondary',
      'ghost',
      'link',
    ] as const;
    variants.forEach((variant) => {
      const { unmount } = render(
        <AyoButton variant={variant}>{variant}</AyoButton>
      );
      const btn = screen.getByRole('button', { name: variant });
      expect(btn).toBeInTheDocument();
      // Common classes everyone gets
      expect(btn.className).toMatch(/inline-flex/);
      expect(btn.className).toMatch(/rounded-2/);
      unmount();
    });
  });

  test('renders compact and icon sizes', () => {
    render(<AyoButton size="compact">x</AyoButton>);
    expect(screen.getByRole('button', { name: 'x' }).className).toMatch(/h-8/);

    render(
      <AyoButton size="icon" aria-label="dot">
        .
      </AyoButton>
    );
    expect(screen.getByRole('button', { name: 'dot' }).className).toMatch(
      /h-9 w-9/
    );
  });

  test('defaults type to "button" to avoid implicit form submit', () => {
    render(<AyoButton>safe</AyoButton>);
    expect(screen.getByRole('button', { name: 'safe' })).toHaveAttribute(
      'type',
      'button'
    );
  });

  test('forwards onClick and respects disabled', async () => {
    const onClick = vi.fn();
    render(
      <AyoButton onClick={onClick} disabled>
        click
      </AyoButton>
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'click' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  test('exposes a focus-visible ring class', () => {
    render(<AyoButton>focus</AyoButton>);
    const btn = screen.getByRole('button', { name: 'focus' });
    expect(btn.className).toMatch(/focus-visible:outline/);
  });
});
