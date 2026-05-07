// src/middleware/first-run-setup-guard.ts
//
// Protects POST /api/auth/setup from remote first-claim on fresh installs.
// The operator-side CLI first-run flow remains the default bootstrap path;
// web setup is loopback-only unless explicitly exposed by env.

'use strict';

const net = require('net') as typeof import('net');
const { apiError, FORBIDDEN } = require('../lib/errors') as {
  apiError(
    res: ResponseLike,
    code: unknown,
    message: string,
    details?: unknown
  ): unknown;
  FORBIDDEN: unknown;
};

type RequestLike = {
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
  connection?: {
    remoteAddress?: string;
  };
};

type ResponseLike = Record<string, unknown>;
type NextFunction = () => void;

type FirstRunSetupGuardOptions = {
  exposeWebSetup?: boolean;
};

const EXPOSE_WEB_SETUP_ENV = 'AYOITSON_EXPOSE_WEB_SETUP';

function createFirstRunSetupGuard(options: FirstRunSetupGuardOptions = {}) {
  const exposeWebSetup =
    typeof options.exposeWebSetup === 'boolean'
      ? options.exposeWebSetup
      : parseBooleanEnv(process.env[EXPOSE_WEB_SETUP_ENV]);

  return function firstRunSetupGuard(
    req: RequestLike,
    res: ResponseLike,
    next: NextFunction
  ) {
    if (exposeWebSetup || isLoopbackRequest(req)) {
      return next();
    }

    return apiError(
      res,
      FORBIDDEN,
      'First-run web setup is only available from loopback by default',
      {
        remediation:
          'Run scripts/first-run.js on the Ayoitson host or set AYOITSON_EXPOSE_WEB_SETUP=1 deliberately.',
      }
    );
  };
}

function isLoopbackRequest(req: RequestLike): boolean {
  const address =
    req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return isLoopbackAddress(address);
}

function isLoopbackAddress(address: unknown): boolean {
  const value = normalizeIpAddress(address);
  if (value === 'localhost') return true;
  if (value === '::1') return true;

  if (value.startsWith('::ffff:')) {
    return isLoopbackAddress(value.slice('::ffff:'.length));
  }

  if (net.isIP(value) === 4) {
    return value.split('.')[0] === '127';
  }

  return false;
}

function normalizeIpAddress(address: unknown): string {
  if (typeof address !== 'string') return '';
  let value = address.trim().toLowerCase();

  if (value.includes(',')) {
    const [first = ''] = value.split(',');
    value = first.trim();
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.slice(1, -1);
  }

  return value;
}

function parseBooleanEnv(value: unknown): boolean {
  return value === '1' || value === 'true';
}

module.exports = {
  EXPOSE_WEB_SETUP_ENV,
  createFirstRunSetupGuard,
  isLoopbackAddress,
  isLoopbackRequest,
  parseBooleanEnv,
};
