// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AyoSelect } from './AyoSelect';

describe('<AyoSelect>', () => {
  test('renders options and lets the user choose one', async () => {
    render(
      <AyoSelect aria-label="picker" defaultValue="a">
        <option value="a">A</option>
        <option value="b">B</option>
      </AyoSelect>
    );
    const select = screen.getByRole('combobox', { name: 'picker' });
    const user = userEvent.setup();
    await user.selectOptions(select, 'b');
    expect((select as HTMLSelectElement).value).toBe('b');
  });

  test('focus-visible ring class present', () => {
    render(
      <AyoSelect aria-label="ring">
        <option value="x">X</option>
      </AyoSelect>
    );
    expect(screen.getByRole('combobox', { name: 'ring' }).className).toMatch(
      /focus-visible:outline/
    );
  });
});
