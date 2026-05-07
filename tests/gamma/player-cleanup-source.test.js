const fs = require('fs');
const path = require('path');

describe('stream fallback cleanup ownership', () => {
  test('fallback FFmpeg replacement remains owned by player cleanup', () => {
    const offlinePlayer = fs.readFileSync(
      path.join(__dirname, '../../src/offline-player.ts'),
      'utf8'
    );
    const plexPlayer = fs.readFileSync(
      path.join(__dirname, '../../src/plex-player.js'),
      'utf8'
    );

    expect(offlinePlayer).toContain('this.ffmpeg = ffmpeg;');
    expect(plexPlayer).toContain('this.ffmpeg = ffmpeg;');
  });
});
