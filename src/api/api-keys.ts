// @ts-nocheck
// src/api/api-keys.js
//
// Authenticated API key lifecycle routes for the React Settings pane.
//
//   GET    /          list key metadata only
//   POST   /          create a key; returns raw key once
//   DELETE /:id       revoke an active key
//
// Raw key material only appears in the POST response. List/revoke never return
// hashes or raw keys.

'use strict';

const express = require('express');

const apiKeyLib = require('../lib/api-keys');
const { writeRequestAudit } = require('../lib/audit');
const {
  apiError,
  VALIDATION_ERROR,
  SERVICE_UNAVAILABLE,
} = require('../lib/errors');
const { asyncRoute, requireBodyString } = require('./_helpers');

function createRouter(deps) {
  const { apiKeyDb, auditLogger } = deps || {};
  const router = express.Router();

  function requireStore(res) {
    if (apiKeyDb) return true;
    apiError(res, SERVICE_UNAVAILABLE, 'API key store is not initialized');
    return false;
  }

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      if (!requireStore(res)) return;
      res.send(apiKeyLib.listKeys(apiKeyDb));
    })
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      if (!requireStore(res)) return;
      const name = requireBodyString(req.body, 'name');
      if (!name) {
        return apiError(res, VALIDATION_ERROR, 'api key name is required', {
          field: 'name',
        });
      }
      const created = await apiKeyLib.createKey(apiKeyDb, name, ['*']);
      writeRequestAudit(auditLogger, req, 'auth.key.created', {
        keyId: created.metadata && created.metadata.id,
        name: created.metadata && created.metadata.name,
      });
      res.status(201).send(created);
    })
  );

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      if (!requireStore(res)) return;
      const id = req.params && req.params.id;
      if (typeof id !== 'string' || id.length === 0) {
        return apiError(res, VALIDATION_ERROR, 'api key id is required', {
          field: 'id',
        });
      }
      const revoked = apiKeyLib.revokeKey(apiKeyDb, id);
      writeRequestAudit(auditLogger, req, 'auth.key.revoked', {
        keyId: id,
        revoked: revoked && revoked.revoked === true,
      });
      res.send(revoked);
    })
  );

  return router;
}

module.exports = { createRouter };
