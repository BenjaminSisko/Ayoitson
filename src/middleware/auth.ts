// src/middleware/auth.ts
// Validates the X-API-Key header against argon2id-hashed entries in the
// api_keys SQLite table. On success, populates req.apiKey with metadata
// (never raw key material). On miss/invalid, returns 401 with the
// structured error envelope.
//
// `X-API-Key` is the contract that closes both F1 (auth) and F7 (CSRF):
// browsers cannot attach custom headers cross-origin without a CORS
// preflight, and our deny-by-default CORS rejects the preflight.

'use strict';

const { verifyKey } = require('../lib/api-keys') as {
  verifyKey(
    db: SqliteDatabase,
    candidate: unknown
  ): Promise<ApiKeyMetadata | null>;
};
const { apiError, UNAUTHORIZED } = require('../lib/errors') as {
  apiError(res: ResponseLike, code: unknown, message: string): unknown;
  UNAUTHORIZED: unknown;
};

const HEADER = 'x-api-key';

type SqliteDatabase = {
  prepare(sql: string): unknown;
};

type ApiKeyMetadata = {
  id: string;
  name: string;
  scopes: string[];
  revokedAt: string | null;
};

type RequestLike = {
  apiKey?: ApiKeyMetadata;
  authFailed?: boolean;
  get?(name: string): string | undefined;
};

type ResponseLike = Record<string, unknown>;
type NextFunction = () => void;

type AuthMiddlewareOptions = {
  bypass?: boolean;
};

function createAuthMiddleware(
  db: SqliteDatabase,
  options: AuthMiddlewareOptions = {}
) {
  if (!db || typeof db.prepare !== 'function') {
    throw new Error('createAuthMiddleware: db (better-sqlite3) is required');
  }

  // Optional bypass for explicit test contexts. Never honored when
  // NODE_ENV === 'production'.
  const bypass =
    Boolean(options.bypass) && process.env.NODE_ENV !== 'production';

  return async function requireApiKey(
    req: RequestLike,
    res: ResponseLike,
    next: NextFunction
  ) {
    if (bypass) {
      req.apiKey = {
        id: 'test',
        name: 'test-bypass',
        scopes: ['*'],
        revokedAt: null,
      };
      return next();
    }

    const candidate = req.get && req.get(HEADER);
    if (!candidate || typeof candidate !== 'string') {
      return apiError(res, UNAUTHORIZED, 'Missing X-API-Key header');
    }

    let metadata: ApiKeyMetadata | null = null;
    try {
      metadata = await verifyKey(db, candidate);
    } catch {
      // Failure to verify is treated as unauthorized; never leak details.
      metadata = null;
    }

    if (!metadata || metadata.revokedAt) {
      // Mark this request for the rate limiter to count as an auth failure.
      req.authFailed = true;
      return apiError(res, UNAUTHORIZED, 'Invalid API key');
    }

    req.apiKey = metadata;
    return next();
  };
}

module.exports = {
  HEADER,
  createAuthMiddleware,
};
