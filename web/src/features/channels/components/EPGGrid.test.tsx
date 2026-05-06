// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

import { EPGGrid } from './EPGGrid';

describe('EPGGrid', () => {
  test('marks the currently airing program', () => {
    render(
      <EPGGrid
        startTime="2026-05-06T16:00:00.000Z"
        now={new Date('2026-05-06T16:45:00.000Z')}
        programs={[
          { title: 'First', duration: 30 * 60 * 1000 },
          { title: 'Second', duration: 30 * 60 * 1000 },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: /second/i })).toHaveAttribute(
      'aria-current',
      'time'
    );
  });
});
