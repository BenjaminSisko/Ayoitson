// tests/security/auth-middleware.test.js
// Phase 4 — flips the previously-expected-failing baseline green.
//   - every /api/* route returns 401 without X-API-Key
//   - a valid X-API-Key allows the request through
//   - the structured error envelope shape is honored

const path = require('path');
const express = require('express');
const request = require('supertest');
const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const { createKey } = require('../../src/lib/api-keys');
const { createAuthMiddleware } = require('../../src/middleware/auth');
const { createAuthProbeApp, urlForRoute } = require('../helpers/api-router');

function freshDb() {
  return openAyoitsonDatabase({
    memory: true,
    migrationsDir: path.resolve(__dirname, '..', '..', 'migrations'),
  });
}

describe('Phase 4 API auth middleware', () => {
  test('every /api/* route returns 401 without X-API-Key', async () => {
    const db = freshDb();
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

  test('401 envelope has {code, message}', async () => {
    const db = freshDb();
    const auth = createAuthMiddleware(db);
    const app = express();
    app.use('/api', auth);
    app.get('/api/sentinel', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/api/sentinel');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    expect(typeof res.body.message).toBe('string');
    db.close();
  });

  test('a valid X-API-Key allows the request through', async () => {
    const db = freshDb();
    const { rawKey } = await createKey(db, 'tester', ['*']);
    const auth = createAuthMiddleware(db);
    const app = express();
    app.use('/api', auth);
    app.get('/api/sentinel', (req, res) =>
      res.json({ ok: true, key: req.apiKey && req.apiKey.id })
    );

    const res = await request(app)
      .get('/api/sentinel')
      .set('X-API-Key', rawKey);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.key).toBe('string');
    db.close();
  });

  test('an invalid X-API-Key still returns 401', async () => {
    const db = freshDb();
    await createKey(db, 'tester', []);
    const auth = createAuthMiddleware(db);
    const app = express();
    app.use('/api', auth);
    app.get('/api/sentinel', (_req, res) => res.json({ ok: true }));

    const res = await request(app)
      .get('/api/sentinel')
      .set('X-API-Key', 'ayo_obviously-bogus');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
    db.close();
  });
});
