// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AyoCheckbox } from './AyoCheckbox';

describe('<AyoCheckbox>', () => {
  test('toggles checked state on click', async () => {
    render(<AyoCheckbox aria-label="opt-in" />);
    const cb = screen.getByRole('checkbox', { name: 'opt-in' });
    expect(cb).not.toBeChecked();
    await userEvent.setup().click(cb);
    expect(cb).toBeChecked();
  });

  test('focus-visible ring class present', () => {
    render(<AyoCheckbox aria-label="focus" />);
    expect(screen.getByRole('checkbox', { name: 'focus' }).className).toMatch(
      /focus-visible:outline/
    );
  });
});
