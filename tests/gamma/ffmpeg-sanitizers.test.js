const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  cleanupDrawtextFiles,
  createDrawtextFile,
  escapeDrawtextLiteral,
} = require('../../src/lib/ffmpeg-escape');
const { validateFFmpegPath } = require('../../src/lib/ffmpeg-path-validator');
const { validateWatermarkUrl } = require('../../src/lib/watermark-validator');

const source = (file) =>
  fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

describe('Lane Gamma Phase 4 FFmpeg sanitizers', () => {
  test('escapeDrawtextLiteral escapes FFmpeg drawtext special characters', () => {
    expect(escapeDrawtextLiteral("a\\b:c'd,e=f\nz")).toBe(
      String.raw`a\\b\:c\'d\,e\=f z`
    );
  });

  test('drawtext tempfiles are written with restrictive mode and cleaned up', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-test-'));
    const files = [];

    try {
      const file = createDrawtextFile("'; some_filter; t='x'", { tmpDir });
      files.push(file);

      expect(path.basename(file)).toMatch(/^ayoitson-drawtext-.*\.txt$/);
      expect(fs.readFileSync(file, 'utf8')).toBe(
        String.raw`\'; some_filter; t\=\'x\'`
      );
      expect(fs.statSync(file).mode & 0o777).toBe(0o600);

      cleanupDrawtextFiles(files);
      expect(fs.existsSync(file)).toBe(false);
    } finally {
      cleanupDrawtextFiles(files);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('stream text overlays use drawtext textfile instead of inline text', () => {
    const ffmpegSource = source('src/ffmpeg.ts');
    const ffmpegTextSource = source('src/ffmpegText.ts');

    expect(ffmpegSource).toContain('textfile=');
    expect(ffmpegTextSource).toContain('textfile=');
    expect(ffmpegSource).not.toContain(":text='${streamUrl.errorTitle}'");
    expect(ffmpegTextSource).not.toContain(":text='${title}'");
  });

  test('watermark validator rejects unsafe schemes, private IPs, and non-HTTPS', async () => {
    await expect(
      validateWatermarkUrl('concat:/etc/passwd|https://safe.example/logo.png', {
        skipReachability: true,
      })
    ).rejects.toThrow(/scheme/);
    await expect(
      validateWatermarkUrl('file:///etc/passwd', { skipReachability: true })
    ).rejects.toThrow(/scheme/);
    await expect(
      validateWatermarkUrl('data:text/plain,hello', { skipReachability: true })
    ).rejects.toThrow(/scheme/);
    await expect(
      validateWatermarkUrl('http://cdn.example/logo.png', {
        resolveHost: async () => [{ address: '93.184.216.34', family: 4 }],
        skipReachability: true,
      })
    ).rejects.toThrow(/HTTPS/);
    await expect(
      validateWatermarkUrl('https://10.0.0.7/logo.png', {
        skipReachability: true,
      })
    ).rejects.toThrow(/private address/);
  });

  test('watermark validator accepts reachable public HTTPS images', async () => {
    const result = await validateWatermarkUrl('https://cdn.example/logo.png', {
      fetchImpl: async () => new Response('', { status: 200 }),
      resolveHost: async () => [{ address: '93.184.216.34', family: 4 }],
    });

    expect(result).toBe('https://cdn.example/logo.png');
  });

  test('ffmpeg path validator rejects shell-shaped paths before stat', () => {
    expect(validateFFmpegPath('/usr/bin/ffmpeg;rm -rf /')).toMatchObject({
      ok: false,
      error: 'ffmpeg path contains invalid characters.',
    });
  });
});
