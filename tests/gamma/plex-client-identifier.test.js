const fs = require('fs');
const os = require('os');
const path = require('path');

const Plex = require('../../src/plex');

describe('Lane Gamma Phase 4 Plex client identifier rotation', () => {
  test('Plex client identifier is generated per install and persists', () => {
    const databaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-db-'));

    try {
      const first = new Plex({
        uri: 'http://plex.example:32400',
        accessToken: 'fixture-token',
        databaseDir,
      });
      const second = new Plex({
        uri: 'http://plex.example:32400',
        accessToken: 'fixture-token',
        databaseDir,
      });

      expect(first.clientIdentifier).toBe(second.clientIdentifier);
      expect(first.clientIdentifier).toContain('org-ayoitson');
      expect(first.clientIdentifier).not.toBe('rg14zekk3pa5zp4safjwaa8z');
    } finally {
      fs.rmSync(databaseDir, { recursive: true, force: true });
    }
  });

  test('explicit client identifier overrides persisted settings', () => {
    const plex = new Plex({
      uri: 'http://plex.example:32400',
      accessToken: 'fixture-token',
      clientIdentifier: 'operator-provided-client-id',
    });

    expect(plex.clientIdentifier).toBe('operator-provided-client-id');
  });
});
