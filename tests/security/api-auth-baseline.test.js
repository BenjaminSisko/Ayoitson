// tests/security/api-auth-baseline.test.js
// Phase 1 baseline test, flipped green by Phase 4 (Lane Epsilon, 2026-05-06).
//
// Original Phase 1 form was `test.fails` to track that no /api/* route had
// auth. Phase 4 ships X-API-Key middleware — see tests/security/auth-middleware.test.js
// for the full auth surface; this file is preserved as the historical
// baseline assertion that the gap is closed.

const path = require('path');
const express = require('express');
const request = require('supertest');
const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const { createAuthMiddleware } = require('../../src/middleware/auth');
const { createAuthProbeApp, urlForRoute } = require('../helpers/api-router');

describe('Phase 1 API auth baseline', () => {
  test('every /api/* route returns 401 without X-API-Key', async () => {
    const db = openAyoitsonDatabase({
      memory: true,
      migrationsDir: path.resolve(__dirname, '..', '..', 'migrations'),
    });
    const auth = createAuthMiddleware(db);
    const { app: probeApp, routes } = createAuthProbeApp();

    const app = express();
    app.use(express.json());
    app.use('/api', auth);
    app.use(probeApp);

    const failures = [];
    for (const route of routes) {
      const response = await request(app)
        [route.method](urlForRoute(route.path))
        .send({});
      if (response.status !== 401) {
        failures.push(
          `${route.method.toUpperCase()} ${route.path} returned ${response.status}`
        );
      }
    }
    expect(failures).toEqual([]);
    db.close();
  });
});
