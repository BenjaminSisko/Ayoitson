const fs = require('fs');
const os = require('os');
const path = require('path');
const { createRuntimeDatabase } = require('../../src/storage/sqlite-runtime');

const FIXTURE_ROOT = path.resolve(
  __dirname,
  '../fixtures/legacy-diskdb-baseline/.dizquetv'
);

function createTempRuntime(options = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-runtime-'));
  const databaseDir = path.join(tempRoot, '.ayoitson');
  const legacyDir = options.legacyDir || path.join(tempRoot, '.dizquetv');
  const db = createRuntimeDatabase({
    databaseDir,
    databasePath: path.join(databaseDir, 'db.sqlite'),
    legacyDir,
    masterKey: Buffer.alloc(32, options.keyByte || 9),
    env: {},
  });
  return { db, tempRoot, databaseDir, legacyDir };
}

describe('Phase 3 SQLite runtime cutover', () => {
  test('seeds singleton settings and supports diskdb-style updates', () => {
    const { db, tempRoot } = createTempRuntime();

    try {
      const ffmpeg = db['ffmpeg-settings'].find()[0];
      expect(ffmpeg).toMatchObject({
        _id: expect.any(String),
        configVersion: 5,
        maxFPS: 60,
      });

      db['ffmpeg-settings'].update(
        { _id: ffmpeg._id },
        { ffmpegPath: ffmpeg.ffmpegPath, maxFPS: 24 }
      );

      expect(db['ffmpeg-settings'].find()[0]).toMatchObject({
        _id: ffmpeg._id,
        maxFPS: 24,
      });
      expect(db['db-version'].find()[0].version).toBe(805);
    } finally {
      db.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('serves decrypted Plex servers while keeping tokens opaque in SQLite', () => {
    const { db, tempRoot } = createTempRuntime({ keyByte: 10 });

    try {
      db['plex-servers'].save({
        name: 'runtime-plex',
        uri: 'http://plex.local:32400',
        accessToken: 'RUNTIME_TOKEN_REDACTED',
        arGuide: false,
        arChannels: false,
        index: 0,
      });

      expect(
        db['plex-servers'].find({ name: 'runtime-plex' })[0]
      ).toMatchObject({
        _id: 'runtime-plex',
        accessToken: 'RUNTIME_TOKEN_REDACTED',
        uri: 'http://plex.local:32400',
      });

      const raw = db.sqlite
        .prepare(
          `SELECT access_token_encrypted, access_token_iv, access_token_tag
           FROM plex_servers WHERE name = ?`
        )
        .get('runtime-plex');
      const rawBlob = Buffer.concat([
        Buffer.from(raw.access_token_encrypted),
        Buffer.from(raw.access_token_iv),
        Buffer.from(raw.access_token_tag),
      ]).toString('utf8');
      expect(rawBlob).not.toContain('RUNTIME_TOKEN_REDACTED');

      db['plex-servers'].update(
        { _id: 'runtime-plex' },
        {
          uri: 'http://plex2.local:32400',
          accessToken: 'RUNTIME_TOKEN_REDACTED_2',
        }
      );
      expect(
        db['plex-servers'].find({ name: 'runtime-plex' })[0]
      ).toMatchObject({
        accessToken: 'RUNTIME_TOKEN_REDACTED_2',
        uri: 'http://plex2.local:32400',
      });
    } finally {
      db.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('backs channels and cache images with SQLite tables', () => {
    const { db, tempRoot } = createTempRuntime({ keyByte: 11 });

    try {
      db.channels.save({
        number: 7,
        name: 'Runtime Seven',
        groupTitle: 'Ayoitson',
        programs: [],
        fallback: [],
      });
      db.channels.update(
        { number: 7 },
        {
          name: 'Runtime Seven Updated',
          programs: [],
          fallback: [],
        }
      );

      expect(db.channels.find({ number: 7 })[0]).toMatchObject({
        _id: '7',
        name: 'Runtime Seven Updated',
      });

      db['cache-images'].save({ url: 'encoded-image-url' });
      db['cache-images'].update(
        { url: 'encoded-image-url' },
        { mimeType: 'image/png' }
      );

      expect(db['cache-images'].find({ url: 'encoded-image-url' })[0]).toEqual(
        expect.objectContaining({
          _id: 'encoded-image-url',
          mimeType: 'image/png',
        })
      );
    } finally {
      db.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('auto-migrates a legacy diskdb fixture before runtime boot', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-legacy-'));
    const legacyDir = path.join(tempRoot, '.dizquetv');
    fs.cpSync(FIXTURE_ROOT, legacyDir, { recursive: true });

    const db = createRuntimeDatabase({
      databaseDir: path.join(tempRoot, '.ayoitson'),
      databasePath: path.join(tempRoot, '.ayoitson', 'db.sqlite'),
      legacyDir,
      masterKey: Buffer.alloc(32, 12),
      env: {},
    });

    try {
      expect(db.channels.find()).toHaveLength(1);
      expect(
        db['plex-servers'].find({ name: 'synthetic-plex' })[0]
      ).toMatchObject({
        accessToken: 'FIXTURE_TOKEN_REDACTED',
        uri: 'http://203.0.113.10:32400',
      });

      const tokenBlob = db.sqlite
        .prepare(
          'SELECT access_token_encrypted FROM plex_servers WHERE name = ?'
        )
        .get('synthetic-plex').access_token_encrypted;
      expect(Buffer.from(tokenBlob).toString('utf8')).not.toContain(
        'FIXTURE_TOKEN_REDACTED'
      );
    } finally {
      db.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
