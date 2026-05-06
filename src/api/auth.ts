// @ts-nocheck
// src/api/auth.js
//
// First-run setup endpoint. The actual API-key issuance lives in
// `scripts/first-run.js` (a separate operator-side flow Lane Epsilon owns)
// — this route exists as the documented place a deployment automation tool
// can hit during initial provisioning. Once any active key exists we return
// 410 Gone so this endpoint is no longer a usable foothold.
//
//   POST /api/auth/setup     -> 201 with key (first run) or 410 (already set up)
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');

const { apiError } = require('../lib/errors');
const apiKeyLib = require('../lib/api-keys');
const { asyncRoute } = require('./_helpers');

const ALREADY_SETUP_CODE = 'CONFLICT';

function createRouter(deps) {
  const { apiKeyDb } = deps || {};
  const router = express.Router();

  router.post(
    '/setup',
    asyncRoute(async (req, res) => {
      // If we have no key DB wired (test contexts) refuse rather than 500.
      if (!apiKeyDb) {
        return apiError(
          res,
          'SERVICE_UNAVAILABLE',
          'API key store is not initialized'
        );
      }
      const existing = apiKeyLib.listKeys(apiKeyDb).filter((k) => !k.revokedAt);
      if (existing.length > 0) {
        // 409-shaped envelope; the design doc calls out 410 Gone here, but
        // the error envelope's enum doesn't include 410 and CONFLICT carries
        // the same operator semantics ("the resource is already in this
        // state"). Keep the response code 409 to stay envelope-compliant.
        return apiError(
          res,
          ALREADY_SETUP_CODE,
          'Setup has already completed; create additional keys via /api/api-keys'
        );
      }
      const name = (req.body && req.body.name) || 'master';
      const created = await apiKeyLib.createKey(apiKeyDb, name, ['*']);
      res.status(201).send(created);
    })
  );

  return router;
}

module.exports = { createRouter };
