// src/api/index.js
//
// Composition root for the Phase 4 per-resource API.
//
// Each resource module exports a `createRouter(deps)` factory that returns an
// Express router with the redesigned REST semantics:
//
//   POST   /api/<resource>           create
//   PUT    /api/<resource>/{id}      update
//   DELETE /api/<resource>/{id}      delete
//   POST   /api/<resource>/reset     reset (settings)
//
// All non-2xx responses go through `apiError(res, code, message, details)` from
// `src/lib/errors.js` so the envelope is uniform.
//
// Auth is mounted *per-router* by the caller (`index.js`):
//   - GET /api/health is public (liveness probe).
//   - Everything else (including GET /api/plex-servers, which returns metadata
//     that, while token-redacted, still discloses server identity/URL) requires
//     X-API-Key.
//
// `compose(deps, { requireApiKey })` builds the full Express router stack and
// returns a single mountable router. Callers may also import the per-resource
// factories directly to wire custom middleware combinations (used in tests).
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');

const channelsModule = require('./channels');
const plexServersModule = require('./plex-servers');
const fillerModule = require('./filler');
const customShowsModule = require('./custom-shows');
const settingsModule = require('./settings');
const guideModule = require('./guide');
const healthModule = require('./health');
const authModule = require('./auth');
const uploadModule = require('./upload');
const versionModule = require('./version');
const legacyCompatModule = require('./legacy-compat');

function passthrough(_req, _res, next) {
  return next();
}

/**
 * Build the full /api router.
 *
 * @param {object} deps - the same dependency bag that the legacy api.js used.
 * @param {object} options
 * @param {Function} [options.requireApiKey] - the auth middleware (Lane Epsilon).
 *   Mounted on every router except `/api/health`. Defaults to a no-op so tests
 *   can opt out and run plain integration coverage.
 * @returns {import('express').Router}
 */
function compose(deps, options = {}) {
  const requireApiKey = options.requireApiKey || passthrough;
  const router = express.Router();

  // Public — no auth required. MUST be mounted before the catch-all auth.
  router.use('/api/health', healthModule.createRouter(deps));

  // First-run setup: gated internally by the route (returns 410 once a key
  // exists). No auth at the router seam.
  router.use('/api/auth', authModule.createRouter(deps));

  // Temporary AngularJS UI compatibility aliases. Mounted before the redesigned
  // resource routers so deprecated methods such as `PUT /api/plex-servers`
  // can translate to the new service contract, while unhandled paths continue
  // to the Phase 4 routers below.
  router.use('/api', requireApiKey, legacyCompatModule.createRouter(deps));

  // Auth-gated resource routers. Each gets its own `requireApiKey` mount so a
  // future change can swap auth/scope/limits per resource without rewiring.
  router.use('/api/channels', requireApiKey, channelsModule.createRouter(deps));
  router.use(
    '/api/plex-servers',
    requireApiKey,
    plexServersModule.createRouter(deps)
  );
  router.use(
    '/api/filler-lists',
    requireApiKey,
    fillerModule.createRouter(deps)
  );
  router.use(
    '/api/custom-shows',
    requireApiKey,
    customShowsModule.createRouter(deps)
  );
  router.use('/api/settings', requireApiKey, settingsModule.createRouter(deps));
  router.use('/api/guide', requireApiKey, guideModule.createRouter(deps));
  router.use('/api/uploads', requireApiKey, uploadModule.createRouter(deps));
  router.use('/api/version', requireApiKey, versionModule.createRouter(deps));

  return router;
}

module.exports = {
  compose,
  modules: {
    channels: channelsModule,
    plexServers: plexServersModule,
    filler: fillerModule,
    customShows: customShowsModule,
    settings: settingsModule,
    guide: guideModule,
    health: healthModule,
    auth: authModule,
    upload: uploadModule,
    version: versionModule,
    legacyCompat: legacyCompatModule,
  },
};
