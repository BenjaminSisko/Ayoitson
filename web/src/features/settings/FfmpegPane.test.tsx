// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { apiClient } from '@/lib/api-client';
import { renderWithClient } from '@/test/render';
import { FfmpegPane } from './FfmpegPane';

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    getFfmpegSettings: vi.fn(),
    updateFfmpegSettings: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('FfmpegPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFfmpegSettings.mockResolvedValue({
      ffmpegPath: '/opt/homebrew/bin/ffmpeg',
      maxFPS: 60,
      maxFrameBuffer: 100,
    });
    mockedApi.updateFfmpegSettings.mockImplementation(
      async (settings) => settings
    );
  });

  test('loads and saves FFmpeg settings through the client', async () => {
    const user = userEvent.setup();
    renderWithClient(<FfmpegPane />);

    expect(
      await screen.findByDisplayValue('/opt/homebrew/bin/ffmpeg')
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Max FPS'));
    await user.type(screen.getByLabelText('Max FPS'), '24');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockedApi.updateFfmpegSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        ffmpegPath: '/opt/homebrew/bin/ffmpeg',
        maxFPS: 24,
      })
    );
  });
});
