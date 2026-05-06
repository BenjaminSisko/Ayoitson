// src/lib/errors.js
// Structured error envelope for the Ayoitson HTTP API.
// All routes (Phase 4 onward) should return errors via apiError() so the
// shape is consistent: { code, message, details? }. No bare strings, no raw
// error objects, no plaintext "error" responses.
//
// Lane Epsilon owns this module; Lane Alpha consumes it from every route.

'use strict';

const CODES = Object.freeze({
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR' },
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  CONFLICT: { status: 409, code: 'CONFLICT' },
  PAYLOAD_TOO_LARGE: { status: 413, code: 'PAYLOAD_TOO_LARGE' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
  INTERNAL: { status: 500, code: 'INTERNAL' },
  UPSTREAM_ERROR: { status: 502, code: 'UPSTREAM_ERROR' },
  SERVICE_UNAVAILABLE: { status: 503, code: 'SERVICE_UNAVAILABLE' },
});

function apiError(res, code, message, details) {
  const entry = CODES[code];
  if (!entry) {
    // Defensive: callers should only use the exported constants. If a typo
    // sneaks through, fail loud in dev, return INTERNAL in prod.
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`apiError: unknown code "${code}"`);
    }
    return apiError(res, 'INTERNAL', 'Internal server error');
  }

  const body = {
    code: entry.code,
    message: typeof message === 'string' && message.length > 0
      ? message
      : entry.code,
  };

  if (details !== undefined && details !== null) {
    body.details = details;
  }

  return res.status(entry.status).json(body);
}

module.exports = {
  apiError,
  CODES,
  // Re-exported for ergonomic destructuring at call sites.
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};
