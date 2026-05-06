// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

import { AyoLabel } from './AyoLabel';

describe('<AyoLabel>', () => {
  test('renders label text and links to its input via htmlFor', () => {
    render(
      <>
        <AyoLabel htmlFor="lbl-test">Field name</AyoLabel>
        <input id="lbl-test" aria-label="x" />
      </>
    );
    expect(screen.getByText('Field name')).toBeInTheDocument();
    expect(screen.getByText('Field name').tagName.toLowerCase()).toBe('label');
  });
});
