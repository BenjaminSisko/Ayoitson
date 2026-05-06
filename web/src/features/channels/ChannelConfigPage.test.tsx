// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithClient } from '@/test/render';
import { ChannelConfigPage } from './ChannelConfigPage';

const mocks = vi.hoisted(() => ({
  updateChannel: vi.fn(async () => ({ number: 1 })),
}));

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    getChannel: vi.fn(async () => ({
      number: 1,
      name: 'Original',
      groupTitle: 'Ayoitson',
      icon: '',
      programs: [{ title: 'Program', duration: 60000 }],
      fallback: [],
      fillerCollections: [],
      watermark: { enabled: false },
      transcoding: { targetResolution: '' },
      onDemand: { isOnDemand: false, modulo: 1 },
    })),
    updateChannel: mocks.updateChannel,
    listFillerLists: vi.fn(async () => []),
  },
}));

describe('ChannelConfigPage', () => {
  test('saves edited metadata', async () => {
    const user = userEvent.setup();

    renderWithClient(<ChannelConfigPage number={1} />);

    await screen.findByDisplayValue('Original');
    await user.clear(screen.getByLabelText('Channel name'));
    await user.type(screen.getByLabelText('Channel name'), 'Updated');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.updateChannel).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Updated', number: 1 })
    );
  });
});
