// src/middleware/helmet.ts
// helmet() configuration with explicit CSP (nonce-based, no unsafe-inline),
// HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, and
// Referrer-Policy strict-origin-when-cross-origin.
//
// CSP posture after the Phase 5 React cutover:
//   - CSP is enforced by default; set AYOITSON_CSP_ENFORCE=0 only for a
//     temporary local diagnostic report-only run.
//   - A per-response nonce is generated and exposed via res.locals.cspNonce.
//     The React HTML fallback replaces the Vite nonce placeholder at request
//     time before serving web/dist/index.html.

'use strict';

const crypto = require('crypto') as typeof import('crypto');
const helmet = require('helmet') as (
  options: Record<string, unknown>
) => unknown;

type RequestLike = Record<string, unknown>;
type ResponseLike = {
  locals: {
    cspNonce?: string;
  };
};
type NextFunction = () => void;

type HelmetOptions = {
  enforce?: boolean;
};

type CspDirectiveValue =
  | string
  | null
  | ((_req: RequestLike, res: ResponseLike) => string);

function nonceMiddleware(
  _req: RequestLike,
  res: ResponseLike,
  next: NextFunction
): void {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
}

function buildCspDirectives(): Record<
  string,
  CspDirectiveValue | CspDirectiveValue[]
> {
  return {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      // The nonce is consumed by helmet's CSP plugin when present in the
      // template via `nonce-${res.locals.cspNonce}`.
      (_req, res) => `'nonce-${res.locals.cspNonce}'`,
    ],
    styleSrc: ["'self'"],
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

function createHelmetMiddleware(options: HelmetOptions = {}) {
  const enforce =
    options.enforce !== undefined
      ? Boolean(options.enforce)
      : process.env.AYOITSON_CSP_ENFORCE !== '0';

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
