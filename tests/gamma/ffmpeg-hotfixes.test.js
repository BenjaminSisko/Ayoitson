const fs = require('fs');
const path = require('path');

const source = (file) =>
  fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

describe('Lane Gamma Phase 1 FFmpeg hot-fixes', () => {
  test('ffmpeg-info probes version with execFile instead of shell exec', () => {
    const ffmpegInfoSource = source('src/ffmpeg-info.js');

    expect(ffmpegInfoSource).toContain(
      "const execFile = require('child_process').execFile;"
    );
    expect(ffmpegInfoSource).toContain(
      "execFile(this.ffmpegPath, ['-version']"
    );
    expect(ffmpegInfoSource).not.toMatch(
      /require\(['"]child_process['"]\)\.exec\b/
    );
    expect(ffmpegInfoSource).not.toMatch(/\bexec\s*\(\s*`/);
  });

  test('concat protocol whitelist excludes local file access', () => {
    const ffmpegSource = source('src/ffmpeg.js');
    const whitelistMatch = ffmpegSource.match(
      /-protocol_whitelist`, `([^`]+)`/
    );

    expect(whitelistMatch && whitelistMatch[1]).toBe('http,tcp,https,tls');
    expect(ffmpegSource).not.toContain('file,http,tcp,https,tcp,tls');
  });

  test('stream response close errors are logged instead of swallowed', () => {
    const videoSource = source('src/video.js');

    expect(videoSource).toContain(
      "console.warn('Unable to end stream response cleanly', err);"
    );
    expect(videoSource).not.toMatch(/catch\s*\([^)]*\)\s*\{\s*\}/);
  });

  test('in-scope streaming localhost URLs use Alpha internal URL helper', () => {
    const ffmpegSource = source('src/ffmpeg.js');
    const videoSource = source('src/video.js');

    expect(ffmpegSource).toContain(
      "const { getInternalBaseUrl } = require('./lib/url')"
    );
    expect(ffmpegSource).toContain(
      '`${getInternalBaseUrl()}/images/generic-error-screen.png`'
    );
    expect(videoSource).toContain(
      "const { getInternalBaseUrl } = require('./lib/url')"
    );
    expect(videoSource).toContain('const baseUrl = getInternalBaseUrl(req);');
    expect(videoSource).not.toContain(
      'http://localhost:${process.env.PORT}/playlist'
    );
    expect(videoSource).not.toContain(
      "file 'http://localhost:${process.env.PORT}/stream"
    );
  });
});
