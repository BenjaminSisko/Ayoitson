// src/middleware/cors.js
// Deny-by-default CORS policy. Same-origin requests are not subject to
// CORS, so this middleware only matters for cross-origin browsers. We
// reject every cross-origin preflight unless the origin matches an
// explicit allowlist (default: empty — only same-origin via no Origin
// header is allowed).
//
// This is the second half of the F7 (CSRF) defense: without a CORS
// preflight permit, a browser cannot send the custom X-API-Key header
// cross-origin, and a forged cookie attack cannot reach /api/*.

'use strict';

const { apiError, FORBIDDEN } = require('../lib/errors');

function parseAllowlist(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function createCorsMiddleware(options = {}) {
  const allowlist = options.allowlist || parseAllowlist(process.env.AYOITSON_CORS_ALLOWLIST);

  return function corsDenyByDefault(req, res, next) {
    const origin = req.get && req.get('origin');
    const requestOrigin = getRequestOrigin(req);

    // Same-origin browser requests do not send Origin (or send the
    // server's own origin). Server-to-server clients (curl, HDHR, Plex
    // DVR) likewise do not send Origin. All of these pass through.
    if (!origin || origin === requestOrigin) {
      return next();
    }

    if (allowlist.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      return next();
    }

    // Cross-origin preflight or actual request from a non-allowlisted
    // origin: hard-deny.
    if (req.method === 'OPTIONS') {
      return res.status(403).end();
    }
    return apiError(res, FORBIDDEN, 'Cross-origin request denied');
  };
}

function getRequestOrigin(req) {
  if (!req || !req.get) return null;
  const host = req.get('host');
  if (!host) return null;
  return `${req.protocol}://${host}`;
}

module.exports = {
  createCorsMiddleware,
  getRequestOrigin,
  parseAllowlist,
};
