// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { normalizeChannel } from '@/features/channels/channel-model';
import { OnDemandConfig } from './OnDemandConfig';

describe('OnDemandConfig', () => {
  test('toggles on-demand playback', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const channel = normalizeChannel({ number: 1 });

    render(<OnDemandConfig channel={channel} onChange={onChange} />);

    await user.click(screen.getByLabelText('On-demand'));

    expect(onChange).toHaveBeenCalledWith({
      isOnDemand: true,
      modulo: 1,
    });
  });
});
