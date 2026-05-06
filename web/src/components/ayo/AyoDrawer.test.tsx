// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { AyoButton } from './AyoButton';
import { AyoDrawer } from './AyoDrawer';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AyoButton onClick={() => setOpen(true)}>Open</AyoButton>
      <AyoDrawer
        open={open}
        onOpenChange={setOpen}
        title="Program detail"
        description="More about this slot"
      >
        <div>Drawer body content</div>
      </AyoDrawer>
    </>
  );
}

describe('<AyoDrawer>', () => {
  test('opens, exposes dialog role, and shows title + description', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Program detail')).toBeInTheDocument();
    expect(screen.getByText('More about this slot')).toBeInTheDocument();
    expect(screen.getByText('Drawer body content')).toBeInTheDocument();
  });

  test('ESC dismisses the drawer (Radix focus-trap defaults)', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders a labeled close button when not hidden', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      await screen.findByRole('button', { name: /close drawer/i })
    ).toBeInTheDocument();
  });
});
