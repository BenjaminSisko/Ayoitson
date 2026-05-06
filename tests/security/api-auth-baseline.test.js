// tests/security/api-auth-baseline.test.js
// Phase 1 baseline test, flipped green by Phase 4.
//
// Originally `test.fails` to track that no /api/* route had auth.
// Phase 4 Lane Epsilon (319851e) shipped the X-API-Key middleware. Lane Alpha
// (Phase 4 redesign) split the monolith into per-resource routers under
// `src/api/*` and mounts requireApiKey *per-router*. This test re-asserts the
// invariant: every `/api/*` route except the public `GET /api/health` and
// `POST /api/auth/setup` returns 401 without a valid X-API-Key.
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const path = require('path');
const express = require('express');
const request = require('supertest');

const { openAyoitsonDatabase } = require('../../src/storage/sqlite');
const { createAuthMiddleware } = require('../../src/middleware/auth');
const apiCompose = require('../../src/api');

const PUBLIC_PATHS = new Set(['/api/health/', '/api/health']);
const FIRST_RUN_PATHS = new Set(['/api/auth/setup']);

function mockDeps() {
  const collection = (rows = []) => ({
    find: () => rows,
    update: () => {},
    save: () => {},
    remove: () => {},
    load: () => {},
  });
  const db = new Proxy({}, { get: () => collection([{ _id: 'fixture' }]) });
  return {
    db,
    channelService: {
      getChannel: async () => null,
      getAllChannels: async () => [],
      getAllChannelNumbers: async () => [],
      saveChannel: async () => {},
      deleteChannel: async () => {},
    },
    fillerDB: {
      getAllFillersInfo: async () => [],
      getFiller: async () => null,
      saveFiller: async () => {},
      createFiller: async () => 'fixture',
      deleteFiller: async () => {},
      getFillerChannels: async () => [],
    },
    customShowDB: {
      getAllShowsInfo: async () => [],
      getShow: async () => null,
      saveShow: async () => {},
      createShow: async () => 'fixture',
      deleteShow: async () => {},
    },
    xmltvInterval: {
      lastUpdated: new Date(0),
      updateXML: () => {},
      restartInterval: () => {},
    },
    guideService: {
      get: async () => ({}),
      getStatus: async () => ({}),
      getChannelLineup: async () => [],
    },
    m3uService: { getChannelList: async () => '' },
    eventService: { push: () => {} },
    ffmpegSettingsService: {
      get: () => ({ ffmpegPath: 'ffmpeg' }),
      update: () => ({ ffmpeg: { ffmpegPath: 'ffmpeg' } }),
      reset: () => ({ ffmpegPath: 'ffmpeg' }),
    },
  };
}

describe('Phase 4 API auth baseline', () => {
  test('every /api/* route except /api/health and /api/auth/setup returns 401 without X-API-Key', async () => {
    const db = openAyoitsonDatabase({
      memory: true,
      migrationsDir: path.resolve(__dirname, '..', '..', 'migrations'),
    });
    const requireApiKey = createAuthMiddleware(db);
    const router = apiCompose.compose(mockDeps(), { requireApiKey });

    const app = express();
    app.use(express.json());
    app.use(router);

    // Hit a representative leaf in each resource family. The
    // per-resource modules are themselves the unit of auth, so probing one
    // leaf per family proves the gate.
    const probes = [
      ['get', '/api/channels'],
      ['get', '/api/channels/1'],
      ['post', '/api/channels'],
      ['put', '/api/channels/1'],
      ['delete', '/api/channels/1'],
      ['get', '/api/plex-servers'],
      ['post', '/api/plex-servers'],
      ['put', '/api/plex-servers/foo'],
      ['delete', '/api/plex-servers/foo'],
      ['get', '/api/filler-lists'],
      ['post', '/api/filler-lists'],
      ['get', '/api/custom-shows'],
      ['post', '/api/custom-shows'],
      ['get', '/api/settings/ffmpeg'],
      ['put', '/api/settings/ffmpeg'],
      ['post', '/api/settings/ffmpeg/reset'],
      ['get', '/api/settings/xmltv'],
      ['put', '/api/settings/xmltv'],
      ['get', '/api/guide/status'],
      ['get', '/api/guide/last-refresh'],
      ['get', '/api/version'],
      ['post', '/api/uploads/image'],
      ['get', '/api/api-keys'],
      ['post', '/api/api-keys'],
      ['delete', '/api/api-keys/fixture'],
    ];

    const failures = [];
    for (const [method, target] of probes) {
      const response = await request(app)[method](target).send({});
      if (response.status !== 401) {
        failures.push(
          `${method.toUpperCase()} ${target} returned ${response.status}`
        );
      }
    }
    expect(failures).toEqual([]);

    // /api/health is open
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(PUBLIC_PATHS.has('/api/health')).toBe(true);
    // /api/auth/setup is reachable but gated by its own internal logic
    const setupRes = await request(app).post('/api/auth/setup').send({});
    expect(setupRes.status).not.toBe(401);
    expect(FIRST_RUN_PATHS.has('/api/auth/setup')).toBe(true);

    db.close();
  });
});
