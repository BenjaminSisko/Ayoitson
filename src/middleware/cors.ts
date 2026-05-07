// src/middleware/cors.ts
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

const { apiError, FORBIDDEN } = require('../lib/errors') as {
  apiError(res: ResponseLike, code: unknown, message: string): unknown;
  FORBIDDEN: unknown;
};

type RequestLike = {
  method?: string;
  protocol?: string;
  get?(name: string): string | undefined;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): { end(): unknown };
};

type NextFunction = () => void;

type CorsMiddlewareOptions = {
  allowlist?: string[];
};

function parseAllowlist(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);
}

function createCorsMiddleware(options: CorsMiddlewareOptions = {}) {
  const allowlist =
    options.allowlist || parseAllowlist(process.env.AYOITSON_CORS_ALLOWLIST);

  return function corsDenyByDefault(
    req: RequestLike,
    res: ResponseLike,
    next: NextFunction
  ) {
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

function getRequestOrigin(req: RequestLike): string | null {
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
