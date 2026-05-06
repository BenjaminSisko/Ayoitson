const fs = require('fs');
const os = require('os');
const path = require('path');
const PlexServerDAO = require('../../src/dao/plex-server-dao');
const {
  backupDatabase,
  openAyoitsonDatabase,
} = require('../../src/storage/sqlite');
const {
  migrateDiskdbToSqlite,
} = require('../../scripts/migrate-diskdb-to-sqlite');

const FIXTURE_ROOT = path.resolve(
  __dirname,
  '../fixtures/legacy-diskdb-baseline/.dizquetv'
);

function copyFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-fixture-'));
  const sourceDir = path.join(tempRoot, '.dizquetv');
  fs.cpSync(FIXTURE_ROOT, sourceDir, { recursive: true });
  return { tempRoot, sourceDir };
}

describe('Phase 3 diskdb to SQLite migration', () => {
  test('migrates the synthetic fixture and encrypts Plex tokens at rest', async () => {
    const { tempRoot, sourceDir } = copyFixture();
    const db = openAyoitsonDatabase({ memory: true });
    const masterKey = Buffer.alloc(32, 3);

    try {
      const result = await migrateDiskdbToSqlite({
        sourceDir,
        db,
        masterKey,
        archiveLegacy: false,
      });

      expect(result.counts).toMatchObject({
        channels: 1,
        programs: 1,
        fillerLists: 1,
        fillerPrograms: 1,
        customShows: 1,
        customShowPrograms: 1,
        plexServers: 1,
        playTimes: 1,
        cacheImages: 1,
      });

      const tokenBlob = db
        .prepare(
          'SELECT access_token_encrypted FROM plex_servers WHERE name = ?'
        )
        .get('synthetic-plex').access_token_encrypted;
      expect(Buffer.from(tokenBlob).toString('utf8')).not.toContain(
        'FIXTURE_TOKEN_REDACTED'
      );

      const dao = new PlexServerDAO(db, { masterKey });
      expect(dao.getDecrypted('synthetic-plex').accessToken).toBe(
        'FIXTURE_TOKEN_REDACTED'
      );
      expect(dao.listPublic()[0]).not.toHaveProperty('accessToken');
    } finally {
      db.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('is idempotent and backs up/restores the SQLite database', async () => {
    const { tempRoot, sourceDir } = copyFixture();
    const dbPath = path.join(tempRoot, '.ayoitson', 'db.sqlite');
    const backupPath = path.join(tempRoot, 'backup.sqlite');
    const masterKey = Buffer.alloc(32, 4);
    const db = openAyoitsonDatabase({ databasePath: dbPath });

    try {
      const first = await migrateDiskdbToSqlite({ sourceDir, db, masterKey });
      const second = await migrateDiskdbToSqlite({ sourceDir, db, masterKey });

      await backupDatabase(db, backupPath);
      const restored = openAyoitsonDatabase({
        databasePath: backupPath,
        readonly: true,
        migrate: false,
      });

      try {
        expect(first.skipped).toBe(false);
        expect(second.skipped).toBe(true);
        expect(
          restored.prepare('SELECT COUNT(*) AS c FROM channels').get().c
        ).toBe(1);
      } finally {
        restored.close();
      }
    } finally {
      db.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
