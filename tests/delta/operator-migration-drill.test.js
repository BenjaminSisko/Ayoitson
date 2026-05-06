const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  migrateDiskdbToSqlite,
  readCounts,
} = require('../../scripts/migrate-diskdb-to-sqlite');
const { decryptToken } = require('../../src/lib/crypto');
const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const manifest = require('../fixtures/legacy-diskdb-baseline/manifest.json');

const FIXTURE_ROOT = path.resolve(
  __dirname,
  '../fixtures/legacy-diskdb-baseline/.dizquetv'
);

function copyFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-drill-'));
  const sourceDir = path.join(tempRoot, '.dizquetv');
  fs.cpSync(FIXTURE_ROOT, sourceDir, { recursive: true });
  return { tempRoot, sourceDir };
}

function expectedFixtureCounts() {
  return {
    channels: manifest.counts.channels,
    programs: manifest.counts.programs,
    fillerLists: manifest.counts.fillerLists,
    fillerPrograms: manifest.counts.fillerPrograms,
    customShows: manifest.counts.customShows,
    customShowPrograms: manifest.counts.customShowPrograms,
    plexServers: manifest.counts.plexServers,
    playTimes: manifest.counts.playTimeEntries,
    cacheImages: manifest.counts.cacheImageRows,
  };
}

function legacyArchives(tempRoot) {
  return fs
    .readdirSync(tempRoot)
    .filter((entry) => entry.startsWith('.dizquetv-legacy-'))
    .sort();
}

describe('Phase 3 operator migration drill', () => {
  test('archives legacy diskdb data, writes SQLite rows, and is idempotent', async () => {
    const { tempRoot, sourceDir } = copyFixture();
    const targetDir = path.join(tempRoot, '.ayoitson');
    const dbPath = path.join(targetDir, 'db.sqlite');
    const masterKey = Buffer.alloc(32, 7);
    const now = new Date('2026-05-06T12:00:00.000Z');

    try {
      const first = await migrateDiskdbToSqlite({
        sourceDir,
        targetDir,
        masterKey,
        archiveLegacy: true,
        now,
      });

      expect(first.skipped).toBe(false);
      expect(first.counts).toMatchObject(expectedFixtureCounts());
      expect(fs.existsSync(dbPath)).toBe(true);
      expect(fs.existsSync(sourceDir)).toBe(false);
      expect(first.legacyArchivePath).toBe(
        path.join(tempRoot, '.dizquetv-legacy-2026-05-06T12-00-00-000Z')
      );
      expect(fs.existsSync(first.legacyArchivePath)).toBe(true);

      const db = openAyoitsonDatabase({
        databasePath: dbPath,
        migrate: false,
      });

      try {
        const countsBefore = readCounts(db);
        expect(countsBefore).toMatchObject(expectedFixtureCounts());
        expect(countsBefore.settings).toBeGreaterThanOrEqual(1);

        const tokenRow = db
          .prepare(
            `SELECT access_token_encrypted, access_token_iv, access_token_tag
             FROM plex_servers WHERE name = ?`
          )
          .get('synthetic-plex');
        expect(tokenRow).toBeTruthy();
        expect(
          Buffer.from(tokenRow.access_token_encrypted).toString('utf8')
        ).not.toContain('FIXTURE_TOKEN_REDACTED');
        expect(
          decryptToken(
            tokenRow.access_token_encrypted,
            tokenRow.access_token_iv,
            tokenRow.access_token_tag,
            masterKey
          )
        ).toBe('FIXTURE_TOKEN_REDACTED');

        const archivesBefore = legacyArchives(tempRoot);
        const second = await migrateDiskdbToSqlite({
          sourceDir,
          targetDir,
          masterKey,
          archiveLegacy: true,
          now: new Date('2026-05-06T12:05:00.000Z'),
        });

        expect(second.skipped).toBe(true);
        expect(second.counts).toEqual(countsBefore);
        expect(readCounts(db)).toEqual(countsBefore);
        expect(legacyArchives(tempRoot)).toEqual(archivesBefore);
      } finally {
        db.close();
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
