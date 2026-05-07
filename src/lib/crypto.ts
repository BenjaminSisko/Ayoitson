const fs = require('fs') as typeof import('fs');
const os = require('os') as typeof import('os');
const path = require('path') as typeof import('path');
const { createCipheriv, createDecipheriv, randomBytes } =
  require('crypto') as typeof import('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEFAULT_KEY_PATH = path.join(os.homedir(), '.ayoitson-master-key');

export type EncryptedToken = string & { readonly __brand: 'Encrypted' };
export type DecryptedToken = string & { readonly __brand: 'Decrypted' };

export type EncryptedTokenRecord = {
  ciphertext: EncryptedToken;
  iv: string;
  tag: string;
};

type MasterKeyOptions = {
  env?: NodeJS.ProcessEnv;
  keyPath?: string;
};

function asEncryptedToken(value: string): EncryptedToken {
  return String(value) as EncryptedToken;
}

function asDecryptedToken(value: string): DecryptedToken {
  return String(value) as DecryptedToken;
}

function encryptToken(
  plain: DecryptedToken,
  masterKey: Buffer
): EncryptedTokenRecord {
  const key = normalizeMasterKey(masterKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plain), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: asEncryptedToken(encodeBase64Url(ciphertext)),
    iv: encodeBase64Url(iv),
    tag: encodeBase64Url(tag),
  };
}

function decryptToken(
  ciphertext: EncryptedToken | string | Buffer | Uint8Array,
  iv: string | Buffer | Uint8Array,
  tag: string | Buffer | Uint8Array,
  masterKey: Buffer
): DecryptedToken {
  const key = normalizeMasterKey(masterKey);
  const decipher = createDecipheriv(ALGORITHM, key, decodeTokenBytes(iv));
  decipher.setAuthTag(decodeTokenBytes(tag));
  return asDecryptedToken(
    Buffer.concat([
      decipher.update(decodeTokenBytes(ciphertext)),
      decipher.final(),
    ]).toString('utf8')
  );
}

function decryptTokenBytes(
  ciphertext: Buffer | Uint8Array,
  iv: Buffer | Uint8Array,
  tag: Buffer | Uint8Array,
  masterKey: Buffer
): DecryptedToken {
  const key = normalizeMasterKey(masterKey);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv));
  decipher.setAuthTag(Buffer.from(tag));
  return asDecryptedToken(
    Buffer.concat([
      decipher.update(Buffer.from(ciphertext)),
      decipher.final(),
    ]).toString('utf8')
  );
}

function encryptTokenToRecord(
  plain: DecryptedToken | string,
  masterKey: Buffer
): EncryptedTokenRecord {
  return encryptToken(asDecryptedToken(String(plain)), masterKey);
}

function decryptTokenRecord(
  record: EncryptedTokenRecord,
  masterKey: Buffer
): DecryptedToken {
  return decryptToken(record.ciphertext, record.iv, record.tag, masterKey);
}

function readOrCreateMasterKey(options: MasterKeyOptions = {}): Buffer {
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

function normalizeMasterKey(value: Buffer | Uint8Array | string): Buffer {
  const key = Buffer.isBuffer(value) ? value : decodeKey(String(value));
  if (key.length !== KEY_BYTES) {
    throw new Error(`Ayoitson master key must be ${KEY_BYTES} bytes`);
  }
  return key;
}

function decodeKey(value: string): Buffer {
  const trimmed = value.trim();
  const encodings: BufferEncoding[] = ['base64url', 'base64', 'hex'];

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

function encodeBase64Url(value: string | Buffer | Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(String(value), 'base64url');
}

function decodeTokenBytes(value: string | Buffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  return decodeBase64Url(value);
}

module.exports = {
  ALGORITHM,
  KEY_BYTES,
  IV_BYTES,
  TAG_BYTES,
  DEFAULT_KEY_PATH,
  asEncryptedToken,
  asDecryptedToken,
  encryptToken,
  decryptToken,
  decryptTokenBytes,
  encryptTokenToRecord,
  decryptTokenRecord,
  readOrCreateMasterKey,
  normalizeMasterKey,
  encodeBase64Url,
  decodeBase64Url,
};
