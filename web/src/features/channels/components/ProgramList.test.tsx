// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProgramList } from './ProgramList';

describe('ProgramList', () => {
  test('adds an offline program and reorders existing programs', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const programs = [
      { title: 'First', duration: 60000 },
      { title: 'Second', duration: 60000 },
    ];

    const { rerender } = render(
      <ProgramList programs={programs} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: 'Offline' }));
    expect(onChange).toHaveBeenCalledWith([
      ...programs,
      {
        title: 'Offline block',
        duration: 1800000,
        isOffline: true,
        type: 'offline',
      },
    ]);

    rerender(<ProgramList programs={programs} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /move second up/i }));
    expect(onChange).toHaveBeenLastCalledWith([
      { title: 'Second', duration: 60000 },
      { title: 'First', duration: 60000 },
    ]);
  });
});
