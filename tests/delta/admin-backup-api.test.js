const path = require('path');
const express = require('express');
const request = require('supertest');

const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const { createKey } = require('../../src/lib/api-keys');
const { createAuthMiddleware } = require('../../src/middleware/auth');
const adminModule = require('../../src/api/admin');

function freshDb() {
  return openAyoitsonDatabase({
    memory: true,
    migrationsDir: path.resolve(__dirname, '..', '..', 'migrations'),
  });
}

function sqliteParser(res, callback) {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

async function createApp(scopes) {
  const db = freshDb();
  const { rawKey } = await createKey(db, 'backup-test', scopes);
  db.prepare(`INSERT OR REPLACE INTO settings (name, value) VALUES (?, ?)`).run(
    'backup-test',
    JSON.stringify({ ok: true })
  );

  const app = express();
  app.use('/api/admin', createAuthMiddleware(db));
  app.use('/api/admin', adminModule.createRouter({ sqliteDb: db }));
  return { app, db, rawKey };
}

describe('admin backup API', () => {
  test('streams a SQLite backup snapshot for admin-scoped keys', async () => {
    const { app, db, rawKey } = await createApp(['admin:backup']);

    try {
      const res = await request(app)
        .get('/api/admin/backup')
        .set('X-API-Key', rawKey)
        .buffer(true)
        .parse(sqliteParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/vnd\.sqlite3/);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="ayoitson-.*\.sqlite"/
      );
      expect(res.body.subarray(0, 16).toString('utf8')).toBe(
        'SQLite format 3\u0000'
      );
    } finally {
      db.close();
    }
  });

  test('rejects authenticated keys without admin backup scope', async () => {
    const { app, db, rawKey } = await createApp(['read']);

    try {
      const res = await request(app)
        .get('/api/admin/backup')
        .set('X-API-Key', rawKey);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        code: 'FORBIDDEN',
        message: 'Admin scope is required to export a database backup',
      });
    } finally {
      db.close();
    }
  });
});
