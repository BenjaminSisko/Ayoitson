// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

import { AyoCard } from './AyoCard';

describe('<AyoCard>', () => {
  test('renders header / body / footer composition', () => {
    render(
      <AyoCard>
        <AyoCard.Header>
          <AyoCard.Title>Title</AyoCard.Title>
          <AyoCard.Description>Description</AyoCard.Description>
        </AyoCard.Header>
        <AyoCard.Body>Body</AyoCard.Body>
        <AyoCard.Footer>Footer</AyoCard.Footer>
      </AyoCard>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  test('uses rounded-tv when radius="tv" (CRT motif)', () => {
    const { container } = render(
      <AyoCard radius="tv">
        <AyoCard.Body>x</AyoCard.Body>
      </AyoCard>
    );
    expect(container.firstChild).toHaveClass('rounded-tv');
  });

  test('default radius is rounded-3', () => {
    const { container } = render(
      <AyoCard>
        <AyoCard.Body>x</AyoCard.Body>
      </AyoCard>
    );
    expect(container.firstChild).toHaveClass('rounded-3');
  });

  test('interactive card opts into the hover-shadow transition', () => {
    const { container } = render(
      <AyoCard interactive>
        <AyoCard.Body>x</AyoCard.Body>
      </AyoCard>
    );
    expect((container.firstChild as HTMLElement).className).toMatch(
      /hover:shadow-1/
    );
  });
});
