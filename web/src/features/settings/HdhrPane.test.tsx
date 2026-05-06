// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithClient } from '@/test/render';
import { apiClient } from '@/lib/api-client';
import { HdhrPane } from './HdhrPane';

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    getHdhrSettings: vi.fn(),
    updateHdhrSettings: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('HdhrPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getHdhrSettings.mockResolvedValue({
      _id: 'hdhr',
      tunerCount: 4,
      autoDiscoveryEnabled: false,
    });
    mockedApi.updateHdhrSettings.mockImplementation(
      async (settings) => settings
    );
  });

  test('loads and saves tuner count and discovery settings through the client', async () => {
    const user = userEvent.setup();
    renderWithClient(<HdhrPane />);

    expect(await screen.findByDisplayValue('4')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Tuner count'));
    await user.type(screen.getByLabelText('Tuner count'), '6');
    await user.click(screen.getByLabelText('Auto discovery enabled'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockedApi.updateHdhrSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'hdhr',
        tunerCount: 6,
        autoDiscoveryEnabled: true,
      })
    );
  });
});
