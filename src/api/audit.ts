// @ts-nocheck
'use strict';

const express = require('express');

const { apiError, SERVICE_UNAVAILABLE } = require('../lib/errors');
const { asyncRoute } = require('./_helpers');

function createRouter(deps) {
  const { auditLogger } = deps || {};
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      if (!auditLogger || typeof auditLogger.readRecent !== 'function') {
        return apiError(
          res,
          SERVICE_UNAVAILABLE,
          'Audit log is not initialized'
        );
      }

      res.send({
        path: auditLogger.filePath,
        entries: auditLogger.readRecent({
          limit: req.query && req.query.limit,
        }),
      });
    })
  );

  return router;
}

module.exports = {
  createRouter,
};
