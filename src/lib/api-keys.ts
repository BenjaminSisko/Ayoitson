// src/lib/api-keys.ts
// API key lifecycle: createKey, revokeKey, listKeys, verifyKey.
//
// Storage: SQLite `api_keys` table (migrations/002_api_keys.sql).
// Hashing: argon2id with server-side parameters tuned for a key check
// (memoryCost=2^16, timeCost=3, parallelism=1). These are sensible defaults
// for a self-hosted server and may be tuned in a future memo if benchmarks
// warrant; the cost is paid once per request and dwarfed by network IO.
// Raw key material is shown ONCE (createKey return value) and never written
// to logs, the database, audit, or stdout outside of scripts/first-run.js.

'use strict';

const crypto = require('crypto') as typeof import('crypto');
const argon2 = require('argon2') as typeof import('argon2');

// Argon2id parameters. The argon2 npm package exposes these constants.
const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MiB
  timeCost: 3,
  parallelism: 1,
});

// Generated keys are 32 bytes of CSPRNG output, base64url-encoded, prefixed
// with "ayo_" for self-identification. Total length ~46 chars.
const KEY_BYTES = 32;
const KEY_PREFIX = 'ayo_';

type SqliteRunResult = {
  changes?: number;
};

type SqliteStatement<T = Record<string, unknown>> = {
  all(...params: unknown[]): T[];
  get(...params: unknown[]): T | undefined;
  run(...params: unknown[]): SqliteRunResult;
};

type SqliteDatabase = {
  prepare<T = Record<string, unknown>>(sql: string): SqliteStatement<T>;
};

type ApiKeyRow = {
  id: string;
  name: string;
  hashed_key: string;
  scopes: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
};

type ApiKeyMetadata = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function generateRawKey(): string {
  const buf = crypto.randomBytes(KEY_BYTES);
  return KEY_PREFIX + buf.toString('base64url');
}

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function isValidKeyShape(key: unknown): key is string {
  return (
    typeof key === 'string' && key.length > 8 && key.startsWith(KEY_PREFIX)
  );
}

function normalizeScopes(scopes: unknown): string[] {
  if (!Array.isArray(scopes)) {
    return [];
  }
  return scopes.filter((s) => typeof s === 'string' && s.length > 0);
}

function rowToMetadata(
  row: ApiKeyRow | undefined | null
): ApiKeyMetadata | null {
  if (!row) return null;
  let scopes: string[] = [];
  try {
    scopes = JSON.parse(row.scopes);
    if (!Array.isArray(scopes)) scopes = [];
  } catch {
    scopes = [];
  }
  return {
    id: row.id,
    name: row.name,
    scopes,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at || null,
    revokedAt: row.revoked_at || null,
  };
}

/**
 * Create a new API key. Returns metadata + the raw key (shown ONCE).
 * Caller is responsible for displaying the raw key to the operator and
 * never persisting it.
 */
async function createKey(
  db: SqliteDatabase,
  name: string,
  scopes: string[] = []
): Promise<{ metadata: ApiKeyMetadata; rawKey: string }> {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('createKey: name is required');
  }

  const id = generateId();
  const rawKey = generateRawKey();
  const hashed = await argon2.hash(rawKey, ARGON2_OPTIONS);
  const scopesJson = JSON.stringify(normalizeScopes(scopes));

  db.prepare(
    `INSERT INTO api_keys (id, name, hashed_key, scopes)
     VALUES (?, ?, ?, ?)`
  ).run(id, name.trim(), hashed, scopesJson);

  const row = db
    .prepare<ApiKeyRow>('SELECT * FROM api_keys WHERE id = ?')
    .get(id);
  const metadata = rowToMetadata(row);
  if (!metadata) {
    throw new Error('createKey: inserted key could not be loaded');
  }

  return {
    metadata,
    rawKey,
  };
}

function revokeKey(db: SqliteDatabase, id: string): { revoked: boolean } {
  if (typeof id !== 'string' || id.length === 0) {
    return { revoked: false };
  }
  const result = db
    .prepare(
      `UPDATE api_keys
       SET revoked_at = datetime('now')
       WHERE id = ? AND revoked_at IS NULL`
    )
    .run(id);
  return { revoked: (result.changes ?? 0) > 0 };
}

function listKeys(db: SqliteDatabase): ApiKeyMetadata[] {
  const rows = db
    .prepare<ApiKeyRow>('SELECT * FROM api_keys ORDER BY created_at DESC')
    .all();
  return rows
    .map(rowToMetadata)
    .filter((metadata): metadata is ApiKeyMetadata => Boolean(metadata));
}

/**
 * Verify a candidate raw key against the api_keys table. Returns the
 * metadata of the matching key on success, or null on failure.
 *
 * NOTE: this iterates active keys and runs argon2.verify per row. For a
 * self-hosted server with O(1)-O(10) keys this is fine; if we ever ship a
 * tier with many keys, add an indexed lookup token (e.g. HMAC prefix) and
 * verify only the matching row.
 */
async function verifyKey(
  db: SqliteDatabase,
  candidate: unknown
): Promise<ApiKeyMetadata | null> {
  if (!isValidKeyShape(candidate)) {
    return null;
  }
  const rows = db
    .prepare<ApiKeyRow>('SELECT * FROM api_keys WHERE revoked_at IS NULL')
    .all();
  for (const row of rows) {
    let ok = false;
    try {
      ok = await argon2.verify(row.hashed_key, candidate);
    } catch {
      ok = false;
    }
    if (ok) {
      try {
        db.prepare(
          `UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`
        ).run(row.id);
      } catch {
        // last_used_at is best-effort; do not fail the request.
      }
      return rowToMetadata(row);
    }
  }
  return null;
}

module.exports = {
  ARGON2_OPTIONS,
  KEY_PREFIX,
  generateRawKey,
  isValidKeyShape,
  createKey,
  revokeKey,
  listKeys,
  verifyKey,
};
