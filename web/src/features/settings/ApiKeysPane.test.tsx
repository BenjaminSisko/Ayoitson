// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithClient } from '@/test/render';
import { apiClient } from '@/lib/api-client';
import { ApiKeysPane } from './ApiKeysPane';

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    listApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('ApiKeysPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listApiKeys.mockResolvedValue([
      {
        id: 'key-1',
        name: 'operator',
        scopes: ['*'],
        createdAt: '2026-05-06T12:00:00Z',
        lastUsedAt: null,
        revokedAt: null,
      },
    ]);
    mockedApi.createApiKey.mockResolvedValue({
      metadata: {
        id: 'key-2',
        name: 'living-room',
        scopes: ['*'],
        createdAt: '2026-05-06T12:01:00Z',
        lastUsedAt: null,
        revokedAt: null,
      },
      rawKey: 'ayo_created_key',
    });
    mockedApi.revokeApiKey.mockResolvedValue({ revoked: true });
  });

  test('lists, creates, and revokes API keys through the client', async () => {
    const user = userEvent.setup();
    renderWithClient(<ApiKeysPane />);

    expect(await screen.findByText('operator')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'living-room');
    await user.click(screen.getByRole('button', { name: /create key/i }));

    expect(mockedApi.createApiKey).toHaveBeenCalledWith('living-room');
    expect(await screen.findByText('ayo_created_key')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /revoke/i }));
    expect(mockedApi.revokeApiKey).toHaveBeenCalledWith('key-1');
  });
});
