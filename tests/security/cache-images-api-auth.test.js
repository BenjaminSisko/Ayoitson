const express = require('express');
const request = require('supertest');

const CacheImageService = require('../../src/services/cache-image-service');
const { createAuthMiddleware } = require('../../src/middleware/auth');
const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const apiKeyLib = require('../../src/lib/api-keys');

function createCacheImageService() {
  return new CacheImageService(
    {
      'cache-images': {
        find: () => [],
        update: () => {},
        save: () => {},
      },
    },
    {
      cachePath: '/tmp/ayoitson-cache-image-test',
      getCache: async () => Buffer.alloc(0),
    }
  );
}

describe('cache image API auth boundary', () => {
  test('DELETE /api/cache/images is behind X-API-Key auth', async () => {
    const db = openAyoitsonDatabase({
      memory: true,
      migrationsDir: require('path').resolve(
        __dirname,
        '..',
        '..',
        'migrations'
      ),
    });
    const service = createCacheImageService();
    service.clearCache = vi.fn(async () => {});

    const app = express();
    app.use(
      '/api/cache/images',
      createAuthMiddleware(db),
      service.apiRouters()
    );

    await request(app).delete('/api/cache/images').expect(401);

    const created = await apiKeyLib.createKey(db, 'cache-test', ['*']);
    await request(app)
      .delete('/api/cache/images')
      .set('X-API-Key', created.rawKey)
      .expect(200);

    expect(service.clearCache).toHaveBeenCalledTimes(1);
    db.close();
  });

  test('cache image API errors use the structured error envelope', async () => {
    const service = createCacheImageService();
    service.clearCache = vi.fn(async () => {
      throw new Error('boom');
    });

    const app = express();
    app.use('/api/cache/images', service.apiRouters());

    const res = await request(app).delete('/api/cache/images').expect(500);
    expect(res.body).toMatchObject({
      code: 'INTERNAL',
      message: 'Cache image clear failed',
    });
  });
});
