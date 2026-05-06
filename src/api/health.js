// src/api/health.js
//
// Public liveness probe. Mounted before the auth middleware so monitoring
// systems / k8s probes / Founder's curl don't have to send X-API-Key.
// Intentionally returns the minimum useful payload — never includes anything
// an attacker can use for fingerprinting beyond what they can already see by
// connecting to the port.
//
//   GET /api/health    -> { status: 'ok', uptime: <seconds>, version: '<name>' }
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');

const constants = require('../constants');
const { asyncRoute } = require('./_helpers');

function createRouter(_deps) {
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      res.send({
        status: 'ok',
        version: constants.VERSION_NAME,
        uptime: process.uptime(),
      });
    })
  );

  return router;
}

module.exports = { createRouter };
