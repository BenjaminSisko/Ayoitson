// src/api/plex-servers.js
//
// Plex servers resource. Note this router is auth-required even on `GET /` —
// the response redacts `accessToken`, but it still discloses server identity
// and URL, which we treat as sensitive metadata.
//
//   GET    /                              list (token-redacted)
//   POST   /                              create
//   PUT    /:name                         update
//   DELETE /:name                         delete
//   POST   /:name/status-check            probe configured server
//   POST   /foreign-status-check          probe an arbitrary server in body
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');

const Plex = require('../plex.js');
const PlexServerDB = require('../dao/plex-server-db');
const {
  apiError,
  VALIDATION_ERROR,
  NOT_FOUND,
} = require('../lib/errors');
const {
  asyncRoute,
  toPublicPlexServer,
  requireBodyString,
  missingPathParam,
  safeString,
} = require('./_helpers');

const PROBE_TIMEOUT_MS = 60000;

async function probeServer(server) {
  const plex = new Plex(server);
  return Promise.race([
    plex.checkServerStatus(),
    new Promise((resolve) => {
      setTimeout(() => resolve(-1), PROBE_TIMEOUT_MS);
    }),
  ]);
}

function createRouter(deps) {
  const { db, channelService, fillerDB, customShowDB, eventService } = deps;
  if (!db) throw new Error('createRouter(plex-servers): db is required');
  const plexServerDB = new PlexServerDB(channelService, fillerDB, customShowDB, db);
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const servers = db['plex-servers'].find();
      servers.sort((a, b) => a.index - b.index);
      res.send(servers.map(toPublicPlexServer));
    })
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      try {
        await plexServerDB.addServer(req.body);
        res.status(201).send({ created: true, name: req.body && req.body.name });
        eventService.push('settings-update', {
          message: `Plex server ${req.body && req.body.name} added.`,
          module: 'plex-server',
          detail: { serverName: req.body && req.body.name, action: 'add' },
          level: 'info',
        });
      } catch (err) {
        console.error('Could not add plex server.', err);
        eventService.push('settings-update', {
          message: 'Error adding plex server.',
          module: 'plex-server',
          detail: {
            action: 'add',
            serverName: safeString(req, 'body', 'name'),
            error: safeString(err, 'message'),
          },
          level: 'danger',
        });
        return apiError(res, VALIDATION_ERROR, 'Could not add plex server', {
          reason: safeString(err, 'message'),
        });
      }
    })
  );

  router.put(
    '/:name',
    asyncRoute(async (req, res) => {
      const name = req.params.name;
      if (!name) return missingPathParam(res, 'name');
      try {
        const body = { ...(req.body || {}), name };
        const report = await plexServerDB.updateServer(body);
        let modifiedPrograms = 0;
        let destroyedPrograms = 0;
        report.forEach((r) => {
          modifiedPrograms += r.modifiedPrograms;
          destroyedPrograms += r.destroyedPrograms;
        });
        res.send({
          updated: true,
          name,
          modifiedPrograms,
          destroyedPrograms,
        });
        eventService.push('settings-update', {
          message: `Plex server ${name} updated. ${modifiedPrograms} programs modified, ${destroyedPrograms} programs deleted`,
          module: 'plex-server',
          detail: { serverName: name, action: 'update' },
          level: 'warning',
        });
      } catch (err) {
        console.error('Could not update plex server.', err);
        eventService.push('settings-update', {
          message: 'Error updating plex server.',
          module: 'plex-server',
          detail: {
            action: 'update',
            serverName: name,
            error: safeString(err, 'message'),
          },
          level: 'danger',
        });
        return apiError(res, VALIDATION_ERROR, 'Could not update plex server', {
          reason: safeString(err, 'message'),
        });
      }
    })
  );

  router.delete(
    '/:name',
    asyncRoute(async (req, res) => {
      const name = req.params.name;
      if (!name) return missingPathParam(res, 'name');
      try {
        const report = await plexServerDB.deleteServer(name);
        res.send({ deleted: true, name, report });
        eventService.push('settings-update', {
          message: `Plex server ${name} removed.`,
          module: 'plex-server',
          detail: { serverName: name, action: 'delete' },
          level: 'warn',
        });
      } catch (err) {
        console.error(err);
        eventService.push('settings-update', {
          message: 'Error deleting plex server.',
          module: 'plex-server',
          detail: {
            action: 'delete',
            serverName: name,
            error: safeString(err, 'message'),
          },
          level: 'danger',
        });
        // Many delete failures are operator-supplied bad name → 404; everything
        // else is upstream/internal. We pick INTERNAL here to match prior
        // 500-class semantics.
        return apiError(res, 'INTERNAL', 'Could not delete plex server');
      }
    })
  );

  router.post(
    '/foreign-status-check',
    asyncRoute(async (req, res) => {
      const server = req.body;
      if (!server || typeof server !== 'object') {
        return apiError(res, VALIDATION_ERROR, 'Body must be a Plex server object');
      }
      const status = await probeServer(server);
      res.send({ status });
    })
  );

  router.post(
    '/:name/status-check',
    asyncRoute(async (req, res) => {
      const name = req.params.name;
      if (!name) return missingPathParam(res, 'name');
      const servers = db['plex-servers'].find({ name });
      if (!servers || servers.length !== 1) {
        return apiError(res, NOT_FOUND, 'Plex server not found', { name });
      }
      const status = await probeServer(servers[0]);
      res.send({ status });
    })
  );

  // Legacy compat helper kept so existing operators doing scripted name lookups
  // can migrate. Intentionally returns VALIDATION_ERROR for the old shapes.
  // (Previously POST /status with name in body, POST /foreignstatus.)
  router.post(
    '/status',
    asyncRoute(async (req, res) => {
      const name = requireBodyString(req.body, 'name');
      if (!name) {
        return apiError(
          res,
          VALIDATION_ERROR,
          'POST /api/plex-servers/status is deprecated; use POST /api/plex-servers/{name}/status-check'
        );
      }
      const servers = db['plex-servers'].find({ name });
      if (!servers || servers.length !== 1) {
        return apiError(res, NOT_FOUND, 'Plex server not found', { name });
      }
      const status = await probeServer(servers[0]);
      res.send({ status });
    })
  );

  return router;
}

module.exports = { createRouter };
