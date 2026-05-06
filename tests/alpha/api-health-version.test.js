// tests/alpha/api-health-version.test.js
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const request = require('supertest');

const { createApiApp } = require('../helpers/api-router');

describe('Phase 4 health and version', () => {
  test('GET /api/health returns ok+uptime+version', async () => {
    const r = await request(createApiApp()).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: 'ok' });
    expect(typeof r.body.uptime).toBe('number');
    expect(typeof r.body.version).toBe('string');
  });
});
