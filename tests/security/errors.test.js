// tests/security/errors.test.js
// Smoke tests for the structured error envelope.

const express = require('express');
const request = require('supertest');
const {
  apiError,
  CODES,
  UNAUTHORIZED,
  VALIDATION_ERROR,
} = require('../../src/lib/errors');

describe('Phase 4 structured error envelope', () => {
  test('apiError emits {code, message} with the correct status', async () => {
    const app = express();
    app.get('/u', (_req, res) =>
      apiError(res, UNAUTHORIZED, 'Missing X-API-Key header')
    );
    app.get('/v', (_req, res) =>
      apiError(res, VALIDATION_ERROR, 'bad', { field: 'name' })
    );

    const u = await request(app).get('/u');
    expect(u.status).toBe(401);
    expect(u.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Missing X-API-Key header',
    });

    const v = await request(app).get('/v');
    expect(v.status).toBe(400);
    expect(v.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'bad',
      details: { field: 'name' },
    });
  });

  test('every documented code has a status entry', () => {
    const required = [
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'PAYLOAD_TOO_LARGE',
      'RATE_LIMITED',
      'INTERNAL',
      'UPSTREAM_ERROR',
      'SERVICE_UNAVAILABLE',
    ];
    for (const code of required) {
      expect(CODES[code]).toBeDefined();
      expect(typeof CODES[code].status).toBe('number');
    }
  });
});
