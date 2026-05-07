// @ts-nocheck
const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const SECRET_KEY_PATTERN =
  /(^|[-_.])(api[-_.]?key|access[-_.]?token|token|password|secret|hashed[-_.]?key|x[-_.]?plex[-_.]?token)([-_.]|$)/i;

function resolveAuditLogPath(options = {}) {
  const databaseDir =
    options.databaseDir ||
    process.env.AYOITSON_DATABASE ||
    process.env.DATABASE ||
    path.join('.', '.ayoitson');
  return options.filePath || path.join(databaseDir, 'audit.log');
}

function createAuditLogger(options = {}) {
  const filePath = resolveAuditLogPath(options);
  const maxBytes = Number(options.maxBytes || DEFAULT_MAX_BYTES);
  const now = options.now || (() => new Date());
  const fsImpl = options.fs || fs;

  function write(event, detail = {}) {
    const record =
      typeof event === 'string'
        ? {
            ts: now().toISOString(),
            event,
            ...sanitizeAuditValue(detail),
          }
        : {
            ts: now().toISOString(),
            ...sanitizeAuditValue(event || {}),
          };

    try {
      fsImpl.mkdirSync(path.dirname(filePath), {
        recursive: true,
        mode: 0o700,
      });
      rotateIfNeeded(fsImpl, filePath, maxBytes, JSON.stringify(record).length);
      fsImpl.appendFileSync(filePath, `${JSON.stringify(record)}\n`, {
        mode: 0o600,
      });
      return true;
    } catch (err) {
      console.error('Unable to write audit log entry.', err);
      return false;
    }
  }

  function readRecent(options = {}) {
    const limit = clampLimit(options.limit);
    if (!fsImpl.existsSync(filePath)) {
      return [];
    }

    const lines = fsImpl
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit);

    return lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { parseError: true, raw: line };
      }
    });
  }

  return {
    filePath,
    write,
    readRecent,
  };
}

function writeRequestAudit(auditLogger, req, event, detail = {}) {
  if (!auditLogger || typeof auditLogger.write !== 'function') {
    return false;
  }

  return auditLogger.write(event, {
    actor: actorFromRequest(req),
    ip: clientIpFromRequest(req),
    userAgent:
      req && typeof req.get === 'function' ? req.get('user-agent') : undefined,
    method: req && req.method,
    path: req && (req.originalUrl || req.path || req.url),
    detail,
  });
}

function actorFromRequest(req) {
  if (req && req.apiKey && req.apiKey.id) {
    return {
      type: 'api-key',
      id: req.apiKey.id,
      name: req.apiKey.name,
    };
  }

  return { type: 'anonymous' };
}

function clientIpFromRequest(req) {
  if (!req) return undefined;
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress;
}

function rotateIfNeeded(fsImpl, filePath, maxBytes, nextBytes) {
  if (!maxBytes || maxBytes <= 0 || !fsImpl.existsSync(filePath)) {
    return;
  }

  const currentBytes = fsImpl.statSync(filePath).size;
  if (currentBytes + nextBytes + 1 <= maxBytes) {
    return;
  }

  const rotatedPath = `${filePath}.${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}`;
  fsImpl.renameSync(filePath, rotatedPath);
}

function sanitizeAuditValue(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item, seen));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  const out = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    out[key] = SECRET_KEY_PATTERN.test(key)
      ? '[REDACTED]'
      : sanitizeAuditValue(nestedValue, seen);
  }
  seen.delete(value);
  return out;
}

function clampLimit(value) {
  const parsed = Number.parseInt(String(value || 100), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return Math.min(parsed, 1000);
}

module.exports = {
  DEFAULT_MAX_BYTES,
  SECRET_KEY_PATTERN,
  actorFromRequest,
  clientIpFromRequest,
  createAuditLogger,
  resolveAuditLogPath,
  sanitizeAuditValue,
  writeRequestAudit,
};
