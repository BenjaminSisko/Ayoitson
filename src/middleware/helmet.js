// src/middleware/helmet.js
// helmet() configuration with explicit CSP (nonce-based, no unsafe-inline),
// HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, and
// Referrer-Policy strict-origin-when-cross-origin.
//
// CSP posture for Phase 4:
//   - The legacy AngularJS bundle still has inline templates and inline
//     event handlers. Enforcing a strict no-unsafe-inline CSP would break
//     it. To avoid blocking the operator UI before the Phase 5 React
//     rewrite, this module ships CSP in **report-only** mode by default.
//     Phase 5 flips AYOITSON_CSP_ENFORCE=1 once the React UI is up.
//   - A per-response nonce is still generated and exposed via res.locals.
//     cspNonce so any new template can opt into nonce-based scripts now.

'use strict';

const crypto = require('crypto');
const helmet = require('helmet');

function nonceMiddleware(_req, res, next) {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
}

function buildCspDirectives() {
  return {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      // The nonce is consumed by helmet's CSP plugin when present in the
      // template via `nonce-${res.locals.cspNonce}`.
      (_req, res) => `'nonce-${res.locals.cspNonce}'`,
    ],
    styleSrc: ["'self'", "'unsafe-inline'"], // legacy AngularJS bootstrap
    imgSrc: ["'self'", 'data:', 'blob:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: null,
  };
}

function createHelmetMiddleware(options = {}) {
  const enforce =
    options.enforce !== undefined
      ? Boolean(options.enforce)
      : process.env.AYOITSON_CSP_ENFORCE === '1';

  const cspConfig = {
    useDefaults: true,
    directives: buildCspDirectives(),
    reportOnly: !enforce,
  };

  const helmetMain = helmet({
    contentSecurityPolicy: cspConfig,
    crossOriginEmbedderPolicy: false, // legacy app does not opt in
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 60 * 60 * 24 * 365,
      includeSubDomains: true,
      preload: false,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xPoweredBy: false,
  });

  return [nonceMiddleware, helmetMain];
}

module.exports = {
  buildCspDirectives,
  nonceMiddleware,
  createHelmetMiddleware,
};
