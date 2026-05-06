// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { apiClient } from '@/lib/api-client';
import { renderWithClient } from '@/test/render';
import { PlexServersPane } from './PlexServersPane';

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    listPlexServers: vi.fn(),
    createPlexServer: vi.fn(),
    deletePlexServer: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('PlexServersPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listPlexServers.mockResolvedValue([
      {
        name: 'Ghost',
        uri: 'https://ghost.plex.direct:32400',
        index: 0,
        arGuide: true,
        arChannels: false,
      },
    ]);
    mockedApi.createPlexServer.mockResolvedValue({
      created: true,
      name: 'Den',
    });
    mockedApi.deletePlexServer.mockResolvedValue({
      deleted: true,
      name: 'Ghost',
    });
  });

  test('lists, adds, and removes Plex servers through the client', async () => {
    const user = userEvent.setup();
    renderWithClient(<PlexServersPane />);

    expect(await screen.findByText('Ghost')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'Den');
    await user.type(screen.getByLabelText('URI'), 'http://den.local:32400');
    await user.type(screen.getByLabelText('Access token'), 'plex-token');
    await user.click(screen.getByRole('button', { name: /add server/i }));

    expect(mockedApi.createPlexServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Den',
        uri: 'http://den.local:32400',
        accessToken: 'plex-token',
      })
    );

    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(mockedApi.deletePlexServer).toHaveBeenCalledWith('Ghost');
  });
});
