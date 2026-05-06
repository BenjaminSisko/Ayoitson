// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { normalizeChannel } from '@/features/channels/channel-model';
import { WatermarkConfig } from './WatermarkConfig';

describe('WatermarkConfig', () => {
  test('validates local watermark URLs', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const channel = normalizeChannel({
      number: 1,
      watermark: {
        enabled: true,
        url: 'http://localhost/logo.png',
        width: 12,
      },
    });

    render(<WatermarkConfig channel={channel} onChange={onChange} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/must be https/i);
    await user.selectOptions(screen.getByLabelText('Position'), ['top-left']);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-left' })
    );
  });
});
