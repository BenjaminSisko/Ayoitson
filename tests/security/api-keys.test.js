// tests/security/api-keys.test.js
// Lifecycle tests for src/lib/api-keys.js: createKey, listKeys, revokeKey,
// verifyKey. Uses a `:memory:` SQLite database with the same migration set
// the runtime uses, so we exercise the real schema.

const path = require('path');
const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const {
  createKey,
  listKeys,
  revokeKey,
  verifyKey,
  isValidKeyShape,
} = require('../../src/lib/api-keys');

function freshDb() {
  return openAyoitsonDatabase({
    memory: true,
    migrationsDir: path.resolve(__dirname, '..', '..', 'migrations'),
  });
}

describe('api-keys library', () => {
  test('createKey returns metadata + raw key with ayo_ prefix', async () => {
    const db = freshDb();
    const { metadata, rawKey } = await createKey(db, 'master', ['*']);
    expect(typeof rawKey).toBe('string');
    expect(rawKey.startsWith('ayo_')).toBe(true);
    expect(isValidKeyShape(rawKey)).toBe(true);
    expect(metadata.name).toBe('master');
    expect(metadata.scopes).toEqual(['*']);
    expect(metadata.revokedAt).toBeNull();
    db.close();
  });

  test('listKeys returns metadata only — never raw key material', async () => {
    const db = freshDb();
    await createKey(db, 'one', []);
    await createKey(db, 'two', ['read']);
    const keys = listKeys(db);
    expect(keys).toHaveLength(2);
    for (const key of keys) {
      expect(key).not.toHaveProperty('rawKey');
      expect(key).not.toHaveProperty('hashed_key');
      expect(key).not.toHaveProperty('hashedKey');
    }
    db.close();
  });

  test('verifyKey accepts the raw key and rejects garbage', async () => {
    const db = freshDb();
    const { rawKey, metadata } = await createKey(db, 'k', []);
    const ok = await verifyKey(db, rawKey);
    expect(ok).not.toBeNull();
    expect(ok.id).toBe(metadata.id);

    const bad = await verifyKey(db, 'ayo_not-a-real-key');
    expect(bad).toBeNull();

    const malformed = await verifyKey(db, 'definitely-not-an-ayo-key');
    expect(malformed).toBeNull();
    db.close();
  });

  test('revokeKey blocks future verification', async () => {
    const db = freshDb();
    const { rawKey, metadata } = await createKey(db, 'k', []);
    const { revoked } = revokeKey(db, metadata.id);
    expect(revoked).toBe(true);
    const result = await verifyKey(db, rawKey);
    expect(result).toBeNull();
    db.close();
  });
});
