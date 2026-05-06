// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { apiClient } from '@/lib/api-client';
import { renderWithClient } from '@/test/render';
import { ChannelListView } from '.';

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    listChannels: vi.fn(),
    createChannel: vi.fn(),
    deleteChannel: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('ChannelListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listChannels.mockResolvedValue([
      { number: 101 },
      { number: 202 },
    ]);
    mockedApi.createChannel.mockResolvedValue({ number: 303 });
    mockedApi.deleteChannel.mockResolvedValue({ deleted: true, number: 101 });
  });

  test('filters channels, creates a required-field channel, and deletes with confirmation', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithClient(<ChannelListView onNavigate={navigate} />);

    expect(await screen.findAllByText('Channel 101')).toHaveLength(2);

    await user.type(screen.getByLabelText('Search channels'), '202');
    expect(screen.queryByText('Channel 101')).not.toBeInTheDocument();
    expect(screen.getAllByText('Channel 202')).toHaveLength(2);

    await user.clear(screen.getByLabelText('Search channels'));
    await user.click(screen.getByRole('button', { name: /create channel/i }));
    const dialog = screen.getByRole('dialog', { name: /create channel/i });
    await user.type(within(dialog).getByLabelText('Channel number'), '303');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    expect(mockedApi.createChannel).toHaveBeenCalledWith({
      number: 303,
      name: 'Channel 303',
      programs: [],
      fallback: [],
    });
    expect(navigate).toHaveBeenCalledWith('/channels/303');

    await user.click(screen.getAllByRole('button', { name: /delete/i })[0]);
    expect(window.confirm).toHaveBeenCalledWith('Delete channel 101?');
    expect(mockedApi.deleteChannel).toHaveBeenCalledWith(101);
  });
});
