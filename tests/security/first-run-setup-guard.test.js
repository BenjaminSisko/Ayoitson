const express = require('express');
const request = require('supertest');

const {
  createFirstRunSetupGuard,
  isLoopbackAddress,
  parseBooleanEnv,
} = require('../../src/middleware/first-run-setup-guard');

function setupApp(options = {}) {
  const app = express();
  app.set('trust proxy', true);
  app.use('/api/auth/setup', createFirstRunSetupGuard(options));
  app.post('/api/auth/setup', (_req, res) => {
    res.status(201).send({ ok: true });
  });
  return app;
}

describe('first-run setup guard', () => {
  test('recognizes loopback addresses', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('127.42.0.9')).toBe(true);
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('192.168.1.25')).toBe(false);
    expect(isLoopbackAddress('203.0.113.10')).toBe(false);
  });

  test('parses explicit env opt-in only', () => {
    expect(parseBooleanEnv('1')).toBe(true);
    expect(parseBooleanEnv('true')).toBe(true);
    expect(parseBooleanEnv('0')).toBe(false);
    expect(parseBooleanEnv(undefined)).toBe(false);
  });

  test('allows loopback web setup by default', async () => {
    await request(setupApp())
      .post('/api/auth/setup')
      .set('X-Forwarded-For', '127.0.0.1')
      .send({ name: 'master' })
      .expect(201);
  });

  test('blocks remote web setup by default with structured envelope', async () => {
    const res = await request(setupApp())
      .post('/api/auth/setup')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ name: 'master' })
      .expect(403);

    expect(res.body).toMatchObject({
      code: 'FORBIDDEN',
      message: 'First-run web setup is only available from loopback by default',
    });
  });

  test('allows deliberate remote web setup opt-in', async () => {
    await request(setupApp({ exposeWebSetup: true }))
      .post('/api/auth/setup')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ name: 'master' })
      .expect(201);
  });
});
