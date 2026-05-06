// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { normalizeChannel } from '@/features/channels/channel-model';
import { renderWithClient } from '@/test/render';
import { FillerSelector } from './FillerSelector';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    listFillerLists: vi.fn(async () => [
      { id: 'news-filler', name: 'News filler' },
    ]),
  },
}));

describe('FillerSelector', () => {
  test('selects a filler list', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const channel = normalizeChannel({ number: 1 });

    renderWithClient(<FillerSelector channel={channel} onChange={onChange} />);

    await user.click(await screen.findByLabelText('News filler'));

    expect(onChange).toHaveBeenCalledWith(
      [{ id: 'news-filler', weight: 1, cooldown: 0 }],
      channel.fillerRepeatCooldown
    );
  });
});
