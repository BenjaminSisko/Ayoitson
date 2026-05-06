// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AyoInput } from './AyoInput';

describe('<AyoInput>', () => {
  test('renders and accepts typed input', async () => {
    render(<AyoInput aria-label="test" />);
    const input = screen.getByRole('textbox', { name: 'test' });
    const user = userEvent.setup();
    await user.type(input, 'hello');
    expect((input as HTMLInputElement).value).toBe('hello');
  });

  test('focus-visible class is present on the element', () => {
    render(<AyoInput aria-label="focus" />);
    const input = screen.getByRole('textbox', { name: 'focus' });
    expect(input.className).toMatch(/focus-visible:outline/);
  });

  test('invalid prop sets aria-invalid', () => {
    render(<AyoInput aria-label="bad" invalid />);
    expect(screen.getByRole('textbox', { name: 'bad' })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });
});
