// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AyoToast, useAyoToast } from './AyoToast';

function Harness() {
  const { toast, ToastViewport } = useAyoToast();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          toast({ title: 'Saved.', tone: 'success', description: 'All good.' })
        }
      >
        fire
      </button>
      <ToastViewport />
    </>
  );
}

describe('<AyoToast>', () => {
  test('useAyoToast spawns a toast with role=status', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'fire' }));
    const status = await screen.findByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.getByText('Saved.')).toBeInTheDocument();
    expect(screen.getByText('All good.')).toBeInTheDocument();
  });

  test('error toast has aria-live=assertive', () => {
    render(
      <AyoToast
        toast={{
          id: 't1',
          title: 'Boom.',
          tone: 'error',
          duration: 0,
        }}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-live',
      'assertive'
    );
  });

  test('dismiss button removes the toast', async () => {
    let calls = 0;
    const { rerender } = render(
      <AyoToast
        toast={{ id: 'x', title: 'hi', tone: 'info', duration: 0 }}
        onDismiss={() => {
          calls += 1;
        }}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(calls).toBe(1);
    // Re-render to satisfy lint about unused rerender
    act(() => {
      rerender(
        <AyoToast
          toast={{ id: 'x', title: 'hi', tone: 'info', duration: 0 }}
          onDismiss={() => {}}
        />
      );
    });
  });
});
