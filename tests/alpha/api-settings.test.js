// tests/alpha/api-settings.test.js
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const request = require('supertest');

const {
  createApiApp,
  createMockDependencies,
  apiCompose,
} = require('../helpers/api-router');
const express = require('express');

describe('Phase 4 settings API', () => {
  test('GET /api/settings/ffmpeg returns ffmpegSettingsService.get()', async () => {
    const r = await request(createApiApp()).get('/api/settings/ffmpeg');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ffmpegPath: 'ffmpeg' });
  });

  test('PUT /api/settings/ffmpeg returns 400 on validation error', async () => {
    const deps = createMockDependencies({
      ffmpegSettingsService: {
        get: () => ({}),
        update: () => ({ error: 'bad ffmpeg path' }),
        reset: () => ({}),
      },
    });
    const app = express();
    app.use(express.json());
    app.use(apiCompose.compose(deps));
    const r = await request(app).put('/api/settings/ffmpeg').send({});
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('POST /api/settings/ffmpeg/reset returns the reset payload', async () => {
    const r = await request(createApiApp()).post('/api/settings/ffmpeg/reset');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ffmpegPath: 'ffmpeg' });
  });

  test('GET /api/settings/xmltv strips the file field', async () => {
    const deps = createMockDependencies({
      db: new Proxy(
        {},
        {
          get: () => ({
            find: () => [
              {
                _id: 'x',
                cache: 12,
                refresh: 4,
                enableImageCache: false,
                file: '/etc/passwd',
              },
            ],
            update: () => {},
            save: () => {},
            load: () => {},
          }),
        }
      ),
    });
    const app = express();
    app.use(express.json());
    app.use(apiCompose.compose(deps));
    const r = await request(app).get('/api/settings/xmltv');
    expect(r.status).toBe(200);
    expect(r.body).not.toHaveProperty('file');
    expect(r.body).toMatchObject({ cache: 12, refresh: 4 });
  });

  test('PUT /api/settings/xmltv rejects an operator-supplied file field', async () => {
    const r = await request(createApiApp())
      .put('/api/settings/xmltv')
      .send({ _id: 'x', cache: 12, refresh: 4, file: '/etc/passwd' });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('POST /api/settings/{plex,xmltv,hdhr}/reset all 200', async () => {
    const app = createApiApp();
    for (const section of ['plex', 'xmltv', 'hdhr']) {
      const r = await request(app).post(`/api/settings/${section}/reset`);
      expect(r.status).toBe(200);
    }
  });
});
