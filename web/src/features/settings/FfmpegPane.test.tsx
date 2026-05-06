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
    resetFfmpegSettings: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('FfmpegPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFfmpegSettings.mockResolvedValue({
      ffmpegPath: '/opt/homebrew/bin/ffmpeg',
      threads: 4,
      concatMuxDelay: '0',
      logFfmpeg: false,
      enableFFMPEGTranscoding: true,
      targetResolution: '1920x1080',
      videoEncoder: 'mpeg2video',
      audioEncoder: 'ac3',
      videoBitrate: 2000,
      videoBufSize: 2000,
      maxFPS: 60,
      scalingAlgorithm: 'bicubic',
      deinterlaceFilter: 'none',
      audioBitrate: 192,
      audioBufSize: 50,
      audioVolumePercent: 100,
      audioChannels: 2,
      audioSampleRate: 48,
      errorScreen: 'pic',
      errorAudio: 'silent',
      normalizeResolution: true,
      normalizeVideoCodec: true,
      normalizeAudioCodec: true,
      normalizeAudio: true,
    });
    mockedApi.updateFfmpegSettings.mockImplementation(
      async (settings) => settings
    );
    mockedApi.resetFfmpegSettings.mockResolvedValue({
      ffmpegPath: '/opt/homebrew/bin/ffmpeg',
      threads: 4,
    });
  });

  test('loads and saves the customizable FFmpeg settings through the client', async () => {
    const user = userEvent.setup();
    renderWithClient(<FfmpegPane />);

    expect(
      await screen.findByDisplayValue('/opt/homebrew/bin/ffmpeg')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Threads')).toBeInTheDocument();
    expect(screen.getByLabelText('Preferred resolution')).toBeInTheDocument();
    expect(screen.getByLabelText('Video encoder')).toHaveValue('mpeg2video');
    expect(screen.getByLabelText('Audio encoder')).toHaveValue('ac3');
    expect(
      screen.getByRole('option', { name: /H\.264 \/ libx264/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /AAC/ })).toBeInTheDocument();
    expect(
      screen.getByText(/Affects client compatibility, picture quality/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Higher values can smooth playback/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Normalize resolution')).toBeChecked();

    await user.selectOptions(screen.getByLabelText('Video encoder'), [
      'h264_nvenc',
    ]);
    await user.selectOptions(screen.getByLabelText('Audio encoder'), ['aac']);
    await user.selectOptions(screen.getByLabelText('Max frame rate'), '24');
    await user.click(screen.getByLabelText('Log FFmpeg to console'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockedApi.updateFfmpegSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        ffmpegPath: '/opt/homebrew/bin/ffmpeg',
        videoEncoder: 'h264_nvenc',
        audioEncoder: 'aac',
        maxFPS: 24,
        logFfmpeg: true,
      })
    );
  });

  test('resets FFmpeg settings through the client', async () => {
    const user = userEvent.setup();
    renderWithClient(<FfmpegPane />);

    await screen.findByDisplayValue('/opt/homebrew/bin/ffmpeg');
    await user.click(screen.getByRole('button', { name: /reset options/i }));

    expect(mockedApi.resetFfmpegSettings).toHaveBeenCalledTimes(1);
  });
});
