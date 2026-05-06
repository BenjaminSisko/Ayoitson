// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

import { AyoButton } from './AyoButton';
import { AyoEmptyState } from './AyoEmptyState';

describe('<AyoEmptyState>', () => {
  test('renders title, description, and an action', () => {
    render(
      <AyoEmptyState
        title="No channels yet."
        description="Make one to get started."
        action={<AyoButton variant="primary">Add channel</AyoButton>}
      />
    );
    expect(
      screen.getByRole('heading', { name: 'No channels yet.' })
    ).toBeInTheDocument();
    expect(screen.getByText('Make one to get started.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add channel' })
    ).toBeInTheDocument();
  });

  test('renders the default no-signal illustration when none provided', () => {
    const { container } = render(<AyoEmptyState title="Quiet" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  test('honors a custom illustration', () => {
    render(
      <AyoEmptyState
        title="Custom"
        illustration={<span data-testid="my-illo">illo</span>}
      />
    );
    expect(screen.getByTestId('my-illo')).toBeInTheDocument();
  });
});
