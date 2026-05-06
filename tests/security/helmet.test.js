// tests/security/helmet.test.js
// Asserts the security headers helmet emits on every response.

const express = require('express');
const request = require('supertest');
const { createHelmetMiddleware } = require('../../src/middleware/helmet');

function buildApp(options) {
  const app = express();
  app.use(createHelmetMiddleware(options));
  app.get('/anything', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('Phase 5 helmet headers', () => {
  test('default enforced CSP ships expected headers without unsafe-inline', async () => {
    const app = buildApp({});
    const res = await request(app).get('/anything');
    expect(res.status).toBe(200);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe(
      'strict-origin-when-cross-origin'
    );
    expect(res.headers['strict-transport-security']).toMatch(/max-age=/);
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toMatch(/default-src/);
    expect(res.headers['content-security-policy']).not.toContain(
      "'unsafe-inline'"
    );
    expect(res.headers['content-security-policy-report-only']).toBeUndefined();
  });

  test('explicit report-only mode emits Content-Security-Policy-Report-Only', async () => {
    const app = buildApp({ enforce: false });
    const res = await request(app).get('/anything');
    expect(res.headers['content-security-policy-report-only']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  test('per-response CSP nonce is present on res.locals', async () => {
    const app = express();
    app.use(createHelmetMiddleware({ enforce: true }));
    app.get('/echo', (_req, res) => res.json({ nonce: res.locals.cspNonce }));
    const res = await request(app).get('/echo');
    expect(res.body.nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
