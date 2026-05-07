const path = require('path');

const {
  parseArgs,
  resolveDestination,
  timestampForFilename,
} = require('../../scripts/backup-sqlite');

describe('backup script helpers', () => {
  test('parses explicit output paths', () => {
    expect(parseArgs(['--output', '/tmp/backup.sqlite'])).toEqual({
      output: '/tmp/backup.sqlite',
    });
    expect(parseArgs(['-o', '/tmp/backup.sqlite'])).toEqual({
      output: '/tmp/backup.sqlite',
    });
    expect(parseArgs(['/tmp/backup.sqlite'])).toEqual({
      output: '/tmp/backup.sqlite',
    });
  });

  test('defaults to a timestamped backup under the data directory', () => {
    const timestamp = timestampForFilename(
      new Date('2026-05-07T12:34:56.789Z')
    );

    expect(timestamp).toBe('2026-05-07T12-34-56-789Z');
    expect(
      resolveDestination({
        databaseDir: '/var/lib/ayoitson',
      })
    ).toMatch(
      new RegExp(
        `^${path
          .join('/var/lib/ayoitson', 'backups', 'ayoitson-')
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\\.sqlite$`
      )
    );
  });
});
