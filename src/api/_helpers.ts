// src/api/_helpers.js
// Internal helpers shared by the per-resource route modules.
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const path = require('path');

const { apiError, VALIDATION_ERROR, INTERNAL } = require('../lib/errors');

type AnyRecord = Record<string, any>;
type RequestLike = AnyRecord;
type ResponseLike = AnyRecord;
type NextLike = (...args: any[]) => void;
type AsyncHandler = (
  req: RequestLike,
  res: ResponseLike,
  next: NextLike
) => Promise<any> | any;

/**
 * Wrap an async route handler so any thrown error becomes a structured
 * `INTERNAL` envelope instead of escaping to Express's default error page.
 *
 * Routes that need to return more specific codes (404, 409, 400, etc.) call
 * `apiError(...)` directly and `return` early; they never throw for those.
 */
function asyncRoute(
  handler: AsyncHandler,
  { logLabel }: { logLabel?: string } = {}
) {
  return async function wrapped(
    req: RequestLike,
    res: ResponseLike,
    next: NextLike
  ) {
    try {
      await handler(req, res, next);
    } catch (err) {
      if (logLabel) {
        console.error(logLabel, err);
      } else {
        console.error(err);
      }
      if (!res.headersSent) {
        apiError(res, INTERNAL, 'Internal server error');
      }
    }
  };
}

/**
 * Parse a positive integer path parameter. Returns the parsed value or null;
 * the caller is responsible for emitting a VALIDATION_ERROR envelope on null.
 */
function parsePositiveInt(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const value = parseInt(String(raw), 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Reject upload filenames that would let the client escape the upload dir
 * via traversal or absolute paths. Lifted from the Phase 1 hardening at
 * src/api.js (closes F5-traversal). Conservative — anything but a plain name.
 */
function hasUnsafeUploadName(name: unknown): boolean {
  return (
    typeof name !== 'string' ||
    name.length === 0 ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('..')
  );
}

/** Strip the Plex `accessToken` from a server before returning to clients. */
function toPublicPlexServer(server: AnyRecord): AnyRecord {
  const publicServer = { ...server };
  delete publicServer.accessToken;
  return publicServer;
}

/**
 * Pull a string field out of a request body, defending against undefined and
 * non-string types. Returns null if the field is missing/malformed.
 */
function requireBodyString(body: unknown, field: string): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as AnyRecord)[field];
  if (typeof value !== 'string' || value.length === 0) return null;
  return value;
}

/**
 * Send a VALIDATION_ERROR envelope for a missing/invalid path parameter.
 */
function missingPathParam(res: ResponseLike, name: string) {
  return apiError(
    res,
    VALIDATION_ERROR,
    `Missing or invalid path parameter "${name}"`,
    {
      field: name,
    }
  );
}

/**
 * Resolve the on-disk xmltv path from the runtime data-dir env var. Hard-coded
 * at `${DATABASE}/xmltv.xml` — closes F10-xmltv-readfile by removing the
 * operator-controllable `xmltvSettings.file` field entirely.
 */
function resolveXmltvPath(): string {
  const dir = process.env.AYOITSON_DATABASE || process.env.DATABASE;
  if (!dir || typeof dir !== 'string') {
    throw new Error(
      'AYOITSON_DATABASE env var is not set; cannot resolve xmltv path'
    );
  }
  return path.join(dir, 'xmltv.xml');
}

/** Safe access for `safeString(obj, 'a', 'b')` patterns from the legacy code. */
function safeString(object: unknown, ...keys: string[]): string {
  let o = object;
  for (const key of keys) {
    if (o == null) return 'missing';
    o = (o as AnyRecord)[key];
    if (typeof o === 'undefined') return 'missing';
  }
  return String(o);
}

module.exports = {
  asyncRoute,
  parsePositiveInt,
  hasUnsafeUploadName,
  toPublicPlexServer,
  requireBodyString,
  missingPathParam,
  resolveXmltvPath,
  safeString,
};
