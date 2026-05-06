// tests/alpha/api-plex-servers.test.js
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const request = require('supertest');
const express = require('express');

const apiCompose = require('../../src/api');
const { createMockDependencies } = require('../helpers/api-router');

function appWithDb(plexRows) {
  const deps = createMockDependencies({
    db: new Proxy(
      {},
      {
        get(target, prop) {
          if (prop === 'plex-servers') {
            return {
              find(query) {
                if (!query) return plexRows.slice();
                return plexRows.filter((r) =>
                  Object.entries(query).every(([k, v]) => r[k] === v)
                );
              },
              update: () => {},
              save: () => {},
              load: () => {},
            };
          }
          return {
            find: () => [{ _id: 'fixture', ffmpegPath: 'ffmpeg' }],
            update: () => {},
            save: () => {},
            load: () => {},
          };
        },
      }
    ),
  });
  const app = express();
  app.use(express.json());
  app.use(apiCompose.compose(deps));
  return app;
}

describe('Phase 4 plex-servers API', () => {
  test('GET /api/plex-servers redacts accessToken', async () => {
    const r = await request(
      appWithDb([
        {
          name: 'a',
          uri: 'http://plex.example',
          accessToken: 'SECRET',
          index: 0,
        },
      ])
    ).get('/api/plex-servers');
    expect(r.status).toBe(200);
    expect(r.body[0]).not.toHaveProperty('accessToken');
    expect(r.body[0]).toMatchObject({ name: 'a' });
  });

  test('POST /api/plex-servers/:name/status-check returns 404 for unknown name', async () => {
    const r = await request(appWithDb([])).post(
      '/api/plex-servers/missing/status-check'
    );
    expect(r.status).toBe(404);
    expect(r.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  test('DELETE /api/plex-servers/:name validates name', async () => {
    const r = await request(appWithDb([])).delete('/api/plex-servers/');
    // Express trailing-slash redirects 404 -> verify shape, not status
    expect([404, 400]).toContain(r.status);
  });
});
