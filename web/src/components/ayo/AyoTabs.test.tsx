// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  AyoTabs,
  AyoTabsContent,
  AyoTabsList,
  AyoTabsTrigger,
} from './AyoTabs';

function harness() {
  return render(
    <AyoTabs defaultValue="a">
      <AyoTabsList aria-label="settings">
        <AyoTabsTrigger value="a">First</AyoTabsTrigger>
        <AyoTabsTrigger value="b">Second</AyoTabsTrigger>
      </AyoTabsList>
      <AyoTabsContent value="a">Panel A</AyoTabsContent>
      <AyoTabsContent value="b">Panel B</AyoTabsContent>
    </AyoTabs>
  );
}

describe('<AyoTabs>', () => {
  test('exposes a tablist with proper roles', () => {
    harness();
    expect(
      screen.getByRole('tablist', { name: 'settings' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  test('arrow-key navigation switches the active tab', async () => {
    harness();
    const user = userEvent.setup();
    const first = screen.getByRole('tab', { name: 'First' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    const second = screen.getByRole('tab', { name: 'Second' });
    expect(second).toHaveAttribute('data-state', 'active');
  });

  test('triggers carry constant font weight (no layout-shift bug)', () => {
    harness();
    const triggers = screen.getAllByRole('tab');
    triggers.forEach((t) => {
      expect(t.className).toMatch(/font-semibold/);
    });
  });
});
