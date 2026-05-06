// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithClient } from '@/test/render';
import { ScheduleEditor } from './ScheduleEditor';

const mocks = vi.hoisted(() => ({
  applyTimeSlots: vi.fn(async () => ({
    programs: [{ title: 'Slotted', duration: 60000 }],
    schedule: { mode: 'time' },
  })),
}));

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    applyTimeSlots: mocks.applyTimeSlots,
    applyRandomSlots: vi.fn(),
  },
}));

describe('ScheduleEditor', () => {
  test('applies time slots from JSON schedule', async () => {
    const user = userEvent.setup();
    const onProgramsChange = vi.fn();
    const onScheduleChange = vi.fn();

    renderWithClient(
      <ScheduleEditor
        programs={[{ title: 'Source', duration: 60000 }]}
        schedule={{}}
        onProgramsChange={onProgramsChange}
        onScheduleChange={onScheduleChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Schedule JSON'), {
      target: { value: '{"days":["mon"]}' },
    });
    await user.click(screen.getByRole('button', { name: 'Time slots' }));

    expect(mocks.applyTimeSlots).toHaveBeenCalledWith(
      [{ title: 'Source', duration: 60000 }],
      { days: ['mon'] }
    );
    expect(await screen.findByLabelText('Schedule JSON')).toHaveValue(
      JSON.stringify({ mode: 'time' }, null, 2)
    );
    expect(onProgramsChange).toHaveBeenCalledWith([
      { title: 'Slotted', duration: 60000 },
    ]);
  });
});
