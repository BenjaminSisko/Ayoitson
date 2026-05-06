// tests/security/cors.test.js
// CORS deny-by-default: a preflight from a foreign origin is rejected;
// same-origin (no Origin header) and allowlisted origins are allowed.

const express = require('express');
const request = require('supertest');
const { createCorsMiddleware } = require('../../src/middleware/cors');

function buildApp(options) {
  const app = express();
  app.use(createCorsMiddleware(options));
  app.get('/api/ping', (_req, res) => res.json({ ok: true }));
  app.options('/api/ping', (_req, res) => res.status(204).end());
  return app;
}

describe('Phase 4 CORS deny-by-default', () => {
  test('preflight from foreign origin is rejected', async () => {
    const app = buildApp({ allowlist: [] });
    const res = await request(app)
      .options('/api/ping')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(403);
  });

  test('GET from foreign origin returns 403 envelope', async () => {
    const app = buildApp({ allowlist: [] });
    const res = await request(app)
      .get('/api/ping')
      .set('Origin', 'https://evil.example.com');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('same-origin request (no Origin header) passes', async () => {
    const app = buildApp({ allowlist: [] });
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('allowlisted origin is permitted', async () => {
    const app = buildApp({ allowlist: ['https://ayoitson.example.com'] });
    const res = await request(app)
      .get('/api/ping')
      .set('Origin', 'https://ayoitson.example.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://ayoitson.example.com'
    );
  });
});
