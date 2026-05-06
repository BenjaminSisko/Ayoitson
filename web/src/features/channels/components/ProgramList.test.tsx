// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  test('windows large lineups instead of rendering every program at once', async () => {
    const user = userEvent.setup();
    const programs = Array.from({ length: 130 }, (_, index) => ({
      title: `Show ${index + 1}`,
      duration: 60000,
    }));

    render(<ProgramList programs={programs} onChange={vi.fn()} />);

    expect(screen.getByText('Showing 1-80 of 130')).toBeInTheDocument();
    expect(screen.getByText('Show 1')).toBeInTheDocument();
    expect(screen.queryByText('Show 81')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next window/i }));

    expect(screen.getByText('Showing 51-130 of 130')).toBeInTheDocument();
    expect(screen.getByText('Show 81')).toBeInTheDocument();
    expect(screen.queryByText('Show 1')).not.toBeInTheDocument();
  });

  test('reorders programs with native drag and drop', () => {
    const onChange = vi.fn();
    const programs = [
      { title: 'First', duration: 60000 },
      { title: 'Second', duration: 60000 },
      { title: 'Third', duration: 60000 },
    ];

    render(<ProgramList programs={programs} onChange={onChange} />);

    const dataTransfer = {
      dropEffect: '',
      effectAllowed: '',
      getData: vi.fn(() => '1'),
      setData: vi.fn(),
    };
    fireEvent.dragStart(screen.getByLabelText('Program 2: Second'), {
      dataTransfer,
    });
    fireEvent.dragOver(screen.getByLabelText('Program 1: First'), {
      dataTransfer,
    });
    fireEvent.drop(screen.getByLabelText('Program 1: First'), {
      dataTransfer,
    });

    expect(onChange).toHaveBeenLastCalledWith([
      { title: 'Second', duration: 60000 },
      { title: 'First', duration: 60000 },
      { title: 'Third', duration: 60000 },
    ]);
  });
});
