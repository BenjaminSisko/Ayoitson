// @ts-nocheck
// Administrative API routes. Phase 7 Lane Delta adds the backup snapshot
// endpoint here because it is a data-platform operation exposed through the
// existing authenticated API seam.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const { backupDatabase } = require('../storage/sqlite');
const { apiError, FORBIDDEN, SERVICE_UNAVAILABLE } = require('../lib/errors');
const { asyncRoute } = require('./_helpers');

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function hasAdminScope(req) {
  const scopes =
    req && req.apiKey && Array.isArray(req.apiKey.scopes)
      ? req.apiKey.scopes
      : [];
  return (
    scopes.includes('*') ||
    scopes.includes('admin') ||
    scopes.includes('admin:backup')
  );
}

function resolveSnapshotDb(deps) {
  if (deps && deps.sqliteDb && typeof deps.sqliteDb.backup === 'function') {
    return deps.sqliteDb;
  }
  if (
    deps &&
    deps.db &&
    deps.db.sqlite &&
    typeof deps.db.sqlite.backup === 'function'
  ) {
    return deps.db.sqlite;
  }
  if (deps && deps.apiKeyDb && typeof deps.apiKeyDb.backup === 'function') {
    return deps.apiKeyDb;
  }
  return null;
}

function cleanupTempBackup(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function createRouter(deps) {
  const router = express.Router();

  router.get(
    '/backup',
    asyncRoute(async (req, res, next) => {
      if (!hasAdminScope(req)) {
        return apiError(
          res,
          FORBIDDEN,
          'Admin scope is required to export a database backup'
        );
      }

      const snapshotDb = resolveSnapshotDb(deps);
      if (!snapshotDb) {
        return apiError(
          res,
          SERVICE_UNAVAILABLE,
          'SQLite database is not initialized'
        );
      }

      const filename = `ayoitson-${timestampForFilename()}.sqlite`;
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'ayoitson-backup-')
      );
      const backupPath = path.join(tempDir, filename);

      try {
        await backupDatabase(snapshotDb, backupPath);
        fs.chmodSync(backupPath, 0o600);
      } catch (err) {
        cleanupTempBackup(tempDir);
        throw err;
      }

      res.setHeader('Content-Type', 'application/vnd.sqlite3');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader('Cache-Control', 'no-store');

      res.download(backupPath, filename, (err) => {
        cleanupTempBackup(tempDir);
        if (err && !res.headersSent && typeof next === 'function') {
          next(err);
        }
      });
    })
  );

  return router;
}

module.exports = {
  createRouter,
  hasAdminScope,
  resolveSnapshotDb,
  timestampForFilename,
};
