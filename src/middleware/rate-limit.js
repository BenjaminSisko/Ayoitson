// src/middleware/rate-limit.js
// express-rate-limit configurations. Two profiles:
//
//   - authFailureLimiter: 10 failed-auth attempts / 15 min / IP. Mounted
//     in front of /api/* so brute-force probes against api_keys cost the
//     attacker but do not lock out a legitimate operator (only requests
//     that the auth middleware flags as failed are counted via skip()).
//   - streamLimiter: a much looser ceiling for streaming endpoints
//     (/video, /m3u, /hdhr, /lineup*). Streamers issue many small range
//     requests; we want DoS protection without breaking playback.

'use strict';

const rateLimit = require('express-rate-limit');
const { apiError, RATE_LIMITED } = require('../lib/errors');

function rateLimitedHandler(_req, res, _next, _options) {
  return apiError(res, RATE_LIMITED, 'Too many requests');
}

function createAuthFailureLimiter(overrides = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitedHandler,
    // Count only failed responses (401 from the auth middleware). The
    // limiter is mounted before the auth middleware so the bucket is
    // checked first on every request, but the increment is post-response
    // and gated to non-2xx via skipSuccessfulRequests.
    skipSuccessfulRequests: true,
    ...overrides,
  });
}

function createStreamLimiter(overrides = {}) {
  return rateLimit({
    windowMs: 60 * 1000,
    // Stream clients (HDHR, VLC, Plex DVR) burst many small requests when
    // seeking. 600/min/IP is high enough to never bite legitimate playback
    // but low enough to throttle a runaway script.
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitedHandler,
    ...overrides,
  });
}

module.exports = {
  createAuthFailureLimiter,
  createStreamLimiter,
};
