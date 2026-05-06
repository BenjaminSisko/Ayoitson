const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const api = require('../../src/api');
const { createRuntimeDatabase } = require('../../src/storage/sqlite-runtime');

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(
    api.router(
      db,
      {
        getAllChannelNumbers: async () => [],
        getAllChannels: async () => [],
        getChannel: async () => null,
        saveChannel: async () => {},
        deleteChannel: async () => {},
      },
      {
        getAllFillersInfo: async () => [],
        getFiller: async () => null,
        saveFiller: async () => {},
        createFiller: async () => 'fixture',
        deleteFiller: async () => {},
        getFillerChannels: async () => [],
      },
      {
        getAllShowsInfo: async () => [],
        getShow: async () => null,
        saveShow: async () => {},
        createShow: async () => 'fixture',
        deleteShow: async () => {},
      },
      {
        lastUpdated: new Date(0),
        updateXML: () => {},
        restartInterval: () => {},
      },
      {
        get: async () => ({}),
        getStatus: async () => ({}),
        getChannelLineup: async () => [],
      },
      {
        getChannelList: async () => '',
      },
      {
        push: () => {},
      },
      {
        get: () => ({ ffmpegPath: 'ffmpeg' }),
        update: () => ({ ffmpeg: { ffmpegPath: 'ffmpeg' } }),
        reset: () => ({ ffmpegPath: 'ffmpeg' }),
      }
    )
  );
  return app;
}

describe('Phase 3 Plex server API redaction', () => {
  test('GET /api/plex-servers does not expose decrypted access tokens', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-api-'));
    const db = createRuntimeDatabase({
      databaseDir: path.join(tempRoot, '.ayoitson'),
      databasePath: path.join(tempRoot, '.ayoitson', 'db.sqlite'),
      legacyDir: path.join(tempRoot, '.missing'),
      masterKey: Buffer.alloc(32, 13),
      env: {},
    });

    try {
      db['plex-servers'].save({
        name: 'api-plex',
        uri: 'http://plex.local:32400',
        accessToken: 'API_TOKEN_REDACTED',
        arGuide: false,
        arChannels: false,
        index: 0,
      });

      expect(db['plex-servers'].find({ name: 'api-plex' })[0].accessToken).toBe(
        'API_TOKEN_REDACTED'
      );

      const response = await request(createApp(db)).get('/api/plex-servers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        name: 'api-plex',
        uri: 'http://plex.local:32400',
      });
      expect(response.body[0]).not.toHaveProperty('accessToken');
      expect(JSON.stringify(response.body)).not.toContain('API_TOKEN_REDACTED');
    } finally {
      db.close();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
