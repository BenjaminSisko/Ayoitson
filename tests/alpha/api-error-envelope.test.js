// tests/alpha/api-error-envelope.test.js
//
// Phase 4 invariant: every non-2xx response is a structured envelope.
// No plain-text "error" payloads. No raw err leak.
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const request = require('supertest');

const { createApiApp } = require('../helpers/api-router');

describe('Phase 4 error envelope', () => {
  test('404 from unknown channel returns the structured envelope', async () => {
    const response = await request(createApiApp()).get('/api/channels/9999');
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
    expect(typeof response.body.message).toBe('string');
  });

  test('400 from invalid path param returns VALIDATION_ERROR', async () => {
    const response = await request(createApiApp()).get('/api/channels/abc');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('error envelope never leaks a stack trace or raw error string', async () => {
    const response = await request(createApiApp())
      .post('/api/channels')
      .send({ name: 'no number' });
    expect(response.status).toBe(400);
    expect(response.text).not.toMatch(/at .*\(.*:.*:\d+\)/);
    expect(response.text).not.toContain('Error:');
  });
});
