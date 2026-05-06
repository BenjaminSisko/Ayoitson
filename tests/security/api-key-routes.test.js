// tests/security/api-key-routes.test.js
// Route-level coverage for the authenticated API key lifecycle used by the SPA.

const path = require('path');
const express = require('express');
const request = require('supertest');

const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const { createKey } = require('../../src/lib/api-keys');
const { createAuthMiddleware } = require('../../src/middleware/auth');
const apiKeysModule = require('../../src/api/api-keys');

function freshDb() {
  return openAyoitsonDatabase({
    memory: true,
    migrationsDir: path.resolve(__dirname, '..', '..', 'migrations'),
  });
}

async function createApp() {
  const db = freshDb();
  const { rawKey } = await createKey(db, 'admin', ['*']);
  const app = express();
  app.use(express.json());
  app.use('/api/api-keys', createAuthMiddleware(db));
  app.use('/api/api-keys', apiKeysModule.createRouter({ apiKeyDb: db }));
  return { app, db, rawKey };
}

describe('api key lifecycle routes', () => {
  test('list, create, and revoke return metadata without leaking stored hashes', async () => {
    const { app, db, rawKey } = await createApp();

    const listRes = await request(app)
      .get('/api/api-keys')
      .set('X-API-Key', rawKey);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0]).toMatchObject({ name: 'admin' });
    expect(listRes.body[0]).not.toHaveProperty('rawKey');
    expect(listRes.body[0]).not.toHaveProperty('hashed_key');

    const createRes = await request(app)
      .post('/api/api-keys')
      .set('X-API-Key', rawKey)
      .send({ name: 'browser' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.metadata).toMatchObject({ name: 'browser' });
    expect(createRes.body.rawKey).toMatch(/^ayo_/);

    const revokeRes = await request(app)
      .delete(`/api/api-keys/${createRes.body.metadata.id}`)
      .set('X-API-Key', rawKey);
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body).toEqual({
      revoked: true,
    });

    db.close();
  });

  test('missing key name returns the structured validation envelope', async () => {
    const { app, db, rawKey } = await createApp();

    const res = await request(app)
      .post('/api/api-keys')
      .set('X-API-Key', rawKey)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { field: 'name' },
    });

    db.close();
  });
});
