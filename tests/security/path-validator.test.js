const path = require('path');
const { validatePath } = require('../../src/lib/path-validator');

describe('SafeFsPath validator', () => {
  test('brands paths resolved inside the configured base directory', () => {
    const baseDir = path.join('/tmp', 'ayoitson-safe-base');

    expect(validatePath('plex-servers.json', baseDir)).toBe(
      path.join(baseDir, 'plex-servers.json')
    );
    expect(validatePath(path.join(baseDir, 'settings.json'), baseDir)).toBe(
      path.join(baseDir, 'settings.json')
    );
  });

  test('rejects traversal, null bytes, and absolute paths outside baseDir', () => {
    const baseDir = path.join('/tmp', 'ayoitson-safe-base');

    expect(() => validatePath('../secret.txt', baseDir)).toThrow(
      /parent-directory/
    );
    expect(() => validatePath('nested/../../secret.txt', baseDir)).toThrow(
      /parent-directory/
    );
    expect(() => validatePath('plex\0servers.json', baseDir)).toThrow(
      /null byte/
    );
    expect(() => validatePath('/etc/passwd', baseDir)).toThrow(
      /outside the allowed base/
    );
  });
});
