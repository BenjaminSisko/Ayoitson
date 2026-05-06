const FFMPEG = require('../../src/ffmpeg');

describe('Lane Gamma FFmpeg output resolution handling', () => {
  const { resolveOutputResolution } = FFMPEG.__test;

  test('does not upscale smaller Plex transcodes to the channel target', () => {
    expect(resolveOutputResolution(720, 404, 3840, 2160)).toEqual({
      w: 720,
      h: 404,
    });
  });

  test('downscales oversized streams to the channel target', () => {
    expect(resolveOutputResolution(3840, 2160, 1920, 1080)).toEqual({
      w: 1920,
      h: 1080,
    });
  });

  test('pads odd dimensions to even dimensions for FFmpeg codecs', () => {
    expect(resolveOutputResolution(721, 405, 3840, 2160)).toEqual({
      w: 722,
      h: 406,
    });
  });
});
