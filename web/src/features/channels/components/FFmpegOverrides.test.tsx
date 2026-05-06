// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { normalizeChannel } from '@/features/channels/channel-model';
import { FFmpegOverrides } from './FFmpegOverrides';

describe('FFmpegOverrides', () => {
  test('updates per-channel transcoding overrides', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const channel = normalizeChannel({ number: 1 });

    render(<FFmpegOverrides channel={channel} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Target resolution'), [
      '1280x720',
    ]);

    expect(onChange).toHaveBeenCalledWith({
      targetResolution: '1280x720',
    });
  });
});
