const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  decryptToken,
  decryptTokenRecord,
  encryptToken,
  encryptTokenToRecord,
  readOrCreateMasterKey,
} = require('../../src/lib/crypto');

describe('Phase 3 token crypto', () => {
  test('encrypts and decrypts Plex tokens with aes-256-gcm', () => {
    const key = Buffer.alloc(32, 7);
    const encrypted = encryptToken('FIXTURE_TOKEN_REDACTED', key);

    expect(Buffer.from(encrypted.iv, 'base64url')).toHaveLength(12);
    expect(Buffer.from(encrypted.tag, 'base64url')).toHaveLength(16);
    expect(encrypted.ciphertext).not.toContain('FIXTURE_TOKEN_REDACTED');
    expect(
      decryptToken(encrypted.ciphertext, encrypted.iv, encrypted.tag, key)
    ).toBe('FIXTURE_TOKEN_REDACTED');
  });

  test('rejects tampered ciphertext on auth tag verification', () => {
    const key = Buffer.alloc(32, 8);
    const encrypted = encryptToken('FIXTURE_TOKEN_REDACTED', key);
    encrypted.ciphertext =
      encrypted.ciphertext[0] === 'A'
        ? `B${encrypted.ciphertext.slice(1)}`
        : `A${encrypted.ciphertext.slice(1)}`;

    expect(() =>
      decryptToken(encrypted.ciphertext, encrypted.iv, encrypted.tag, key)
    ).toThrow();
  });

  test('supports base64url records and 0600 generated key files', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-key-'));
    const keyPath = path.join(tempRoot, '.ayoitson-master-key');

    try {
      const key = readOrCreateMasterKey({ keyPath, env: {} });
      const stat = fs.statSync(keyPath);
      const record = encryptTokenToRecord('FIXTURE_TOKEN_REDACTED', key);

      expect(key).toHaveLength(32);
      expect((stat.mode & 0o777).toString(8)).toBe('600');
      expect(decryptTokenRecord(record, key)).toBe('FIXTURE_TOKEN_REDACTED');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
