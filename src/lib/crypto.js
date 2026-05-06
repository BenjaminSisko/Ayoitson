const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEFAULT_KEY_PATH = path.join(os.homedir(), '.ayoitson-master-key');

function encryptToken(plain, masterKey) {
  const key = normalizeMasterKey(masterKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plain), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return { ciphertext, iv, tag };
}

function decryptToken(ciphertext, iv, tag, masterKey) {
  const key = normalizeMasterKey(masterKey);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv));
  decipher.setAuthTag(Buffer.from(tag));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext)),
    decipher.final(),
  ]).toString('utf8');
}

function encryptTokenToRecord(plain, masterKey) {
  const encrypted = encryptToken(plain, masterKey);
  return {
    ciphertext: encodeBase64Url(encrypted.ciphertext),
    iv: encodeBase64Url(encrypted.iv),
    tag: encodeBase64Url(encrypted.tag),
  };
}

function decryptTokenRecord(record, masterKey) {
  return decryptToken(
    decodeBase64Url(record.ciphertext),
    decodeBase64Url(record.iv),
    decodeBase64Url(record.tag),
    masterKey
  );
}

function readOrCreateMasterKey(options = {}) {
  const env = options.env || process.env;
  const keyPath = options.keyPath || DEFAULT_KEY_PATH;

  if (env.AYOITSON_MASTER_KEY) {
    return normalizeMasterKey(env.AYOITSON_MASTER_KEY);
  }

  if (fs.existsSync(keyPath)) {
    const encoded = fs.readFileSync(keyPath, 'utf8').trim();
    const key = normalizeMasterKey(encoded);
    try {
      fs.chmodSync(keyPath, 0o600);
    } catch (err) {
      // chmod can fail on some filesystems; reading a valid key should not.
    }
    return key;
  }

  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  const key = randomBytes(KEY_BYTES);
  fs.writeFileSync(keyPath, `${encodeBase64Url(key)}\n`, {
    mode: 0o600,
    flag: 'wx',
  });
  return key;
}

function normalizeMasterKey(value) {
  const key = Buffer.isBuffer(value) ? value : decodeKey(String(value));
  if (key.length !== KEY_BYTES) {
    throw new Error(`Ayoitson master key must be ${KEY_BYTES} bytes`);
  }
  return key;
}

function decodeKey(value) {
  const trimmed = value.trim();
  const encodings = ['base64url', 'base64', 'hex'];

  for (const encoding of encodings) {
    try {
      const decoded = Buffer.from(trimmed, encoding);
      if (decoded.length === KEY_BYTES) {
        return decoded;
      }
    } catch (err) {
      // Try the next supported encoding.
    }
  }

  return Buffer.from(trimmed, 'utf8');
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value) {
  return Buffer.from(String(value), 'base64url');
}

module.exports = {
  ALGORITHM,
  KEY_BYTES,
  IV_BYTES,
  TAG_BYTES,
  DEFAULT_KEY_PATH,
  encryptToken,
  decryptToken,
  encryptTokenToRecord,
  decryptTokenRecord,
  readOrCreateMasterKey,
  normalizeMasterKey,
  encodeBase64Url,
  decodeBase64Url,
};
