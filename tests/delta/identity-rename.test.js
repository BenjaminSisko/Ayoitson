const express = require('express');
const os = require('os');
const path = require('path');
const request = require('supertest');
const constants = require('../../src/constants');
const hdhr = require('../../src/hdhr');
const { createUploadApp } = require('../helpers/api-router');
const { createClientIdentifier } = require('../../src/lib/client-identifier');
const { resolveDatabasePath } = require('../../src/storage/sqlite');

describe('Phase 4 Ayoitson identity rename', () => {
  test('GET /api/version returns the Ayoitson product name', async () => {
    const response = await request(createUploadApp()).get('/api/version');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: constants.APP_NAME,
      version: constants.VERSION_NAME,
      nodejs: process.version,
    });
    expect(Object.keys(response.body)).not.toContain('dizque' + 'tv');
  });

  test('HDHR discovery uses Ayoitson as the friendly name', async () => {
    const app = express();
    const db = {
      'hdhr-settings': {
        find: () => [{ tunerCount: 2, autoDiscovery: false }],
      },
    };
    const channelDB = {
      getAllChannels: async () => [],
    };

    app.use(hdhr(db, channelDB).router);

    const discover = await request(app).get('/discover.json');
    expect(discover.status).toBe(200);
    expect(discover.body).toMatchObject({
      FriendlyName: constants.APP_NAME,
      Manufacturer: 'Silicondust',
    });

    const device = await request(app).get('/device.xml');
    expect(device.status).toBe(200);
    expect(device.text).toContain(
      `<friendlyName>${constants.APP_NAME}</friendlyName>`
    );
  });

  test('client identifiers use the Ayoitson namespace suffix', () => {
    expect(createClientIdentifier('test')).toMatch(/-org-ayoitson-test$/);
  });

  test('DATABASE remains a one-release fallback for standalone SQLite opens', () => {
    const previousAyoitsonDatabase = process.env.AYOITSON_DATABASE;
    const previousDatabase = process.env.DATABASE;
    const legacyFallback = path.join(os.tmpdir(), 'ayoitson-database-fallback');

    try {
      delete process.env.AYOITSON_DATABASE;
      process.env.DATABASE = legacyFallback;

      expect(resolveDatabasePath()).toBe(
        path.join(legacyFallback, 'db.sqlite')
      );
    } finally {
      restoreEnv('AYOITSON_DATABASE', previousAyoitsonDatabase);
      restoreEnv('DATABASE', previousDatabase);
    }
  });
});

function restoreEnv(name, value) {
  if (typeof value === 'undefined') {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
