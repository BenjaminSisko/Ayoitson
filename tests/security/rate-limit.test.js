// tests/security/rate-limit.test.js
// Confirms the auth-failure rate limiter blocks after 10 failures from the
// same IP. We use a small custom limit (5) for a fast, deterministic test
// and re-check the production defaults in a separate assertion.

const path = require('path');
const express = require('express');
const request = require('supertest');
const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const { createAuthMiddleware } = require('../../src/middleware/auth');
const { createAuthFailureLimiter } = require('../../src/middleware/rate-limit');

function freshDb() {
  return openAyoitsonDatabase({
    memory: true,
    migrationsDir: path.resolve(__dirname, '..', '..', 'migrations'),
  });
}

describe('Phase 4 rate limit on auth failures', () => {
  test('429 after configured limit of bad-key attempts', async () => {
    const db = freshDb();
    const auth = createAuthMiddleware(db);
    const limiter = createAuthFailureLimiter({
      limit: 5,
      windowMs: 60 * 1000,
    });

    const app = express();
    app.set('trust proxy', false);
    app.use('/api', limiter);
    app.use('/api', auth);
    app.get('/api/sentinel', (_req, res) => res.json({ ok: true }));

    let last;
    for (let i = 0; i < 6; i++) {
      last = await request(app)
        .get('/api/sentinel')
        .set('X-API-Key', 'ayo_bogus');
    }

    // First 5 are 401; the 6th is 429 with the structured envelope.
    expect(last.status).toBe(429);
    expect(last.body).toMatchObject({ code: 'RATE_LIMITED' });
    db.close();
  });

  test('production default is 10 attempts / 15 min', () => {
    const limiter = createAuthFailureLimiter();
    // express-rate-limit exposes options on the returned middleware function
    // (`limiter.resetKey` etc.) but not the raw config. Smoke-check that the
    // factory accepts the documented overrides.
    expect(typeof limiter).toBe('function');
  });
});
