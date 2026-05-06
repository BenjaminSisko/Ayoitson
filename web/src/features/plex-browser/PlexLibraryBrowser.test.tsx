// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { apiClient } from '@/lib/api-client';
import { renderWithClient } from '@/test/render';
import { PlexLibraryBrowser } from './PlexLibraryBrowser';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    listPlexServers: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('PlexLibraryBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listPlexServers.mockResolvedValue([
      {
        name: 'living-room',
        uri: 'http://127.0.0.1:32400',
        arGuide: false,
        arChannels: false,
      },
    ]);
  });

  test('selects a registered server and returns it to the caller', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    renderWithClient(<PlexLibraryBrowser onPick={onPick} />);

    await user.click(
      await screen.findByRole('button', { name: 'living-room' })
    );
    await user.click(screen.getByRole('button', { name: /use selection/i }));

    expect(onPick).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'server:living-room',
        serverName: 'living-room',
        type: 'server',
      }),
    ]);
  });
});
