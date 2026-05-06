// tests/alpha/provider-feeds.test.js
//
// Plex and tuner clients cannot send Ayoitson's `X-API-Key` header when they
// fetch XMLTV/M3U provider feeds. The feeds therefore live outside `/api/*`
// while the API auth baseline remains intact.
//
// — Codex (OpenAI), Lane Alpha · 2026-05-06

const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');

const apiCompose = require('../../src/api');
const M3uService = require('../../src/services/m3u-service');
const { createMockDependencies } = require('../helpers/api-router');

function denyApi(_req, res) {
  return res.status(401).json({ code: 'UNAUTHORIZED', message: 'denied' });
}

describe('public provider feeds', () => {
  let previousDatabase;
  let previousAyoitsonDatabase;
  let previousInternalUrl;
  let tempRoot;

  beforeEach(() => {
    previousDatabase = process.env.DATABASE;
    previousAyoitsonDatabase = process.env.AYOITSON_DATABASE;
    previousInternalUrl = process.env.INTERNAL_URL;
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-provider-'));
    process.env.DATABASE = tempRoot;
    process.env.AYOITSON_DATABASE = tempRoot;
    process.env.INTERNAL_URL = 'http://provider.example:8000';
  });

  afterEach(() => {
    if (typeof previousDatabase === 'undefined') {
      delete process.env.DATABASE;
    } else {
      process.env.DATABASE = previousDatabase;
    }
    if (typeof previousAyoitsonDatabase === 'undefined') {
      delete process.env.AYOITSON_DATABASE;
    } else {
      process.env.AYOITSON_DATABASE = previousAyoitsonDatabase;
    }
    if (typeof previousInternalUrl === 'undefined') {
      delete process.env.INTERNAL_URL;
    } else {
      process.env.INTERNAL_URL = previousInternalUrl;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  function createProviderApp() {
    const deps = createMockDependencies({
      m3uService: {
        getChannelList: async (host) =>
          `#EXTM3U x-tvg-url="${host}/xmltv.xml"\n${host}/video?channel=1\n`,
      },
    });
    const app = express();
    app.use(express.json());
    app.use(apiCompose.compose(deps, { requireApiKey: denyApi }));
    return app;
  }

  test('GET /xmltv.xml is public and serves the generated XMLTV feed', async () => {
    fs.writeFileSync(
      path.join(tempRoot, 'xmltv.xml'),
      '<tv><channel id="1">{{host}}</channel><icon src="http://127.0.0.1:8000/images/ayoitson.png"/></tv>'
    );

    const response = await request(createProviderApp()).get('/xmltv.xml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.text).toContain('http://provider.example:8000');
    expect(response.text).not.toContain('http://127.0.0.1:8000');
  });

  test('GET /channels.m3u is public and points at the public XMLTV URL', async () => {
    const response = await request(createProviderApp()).get('/channels.m3u');

    expect(response.status).toBe(200);
    expect(response.text).toContain('http://provider.example:8000/xmltv.xml');
    expect(response.text).not.toContain('/api/xmltv.xml');
  });

  test('M3U generation rewrites loopback channel logo URLs for provider clients', () => {
    const service = new M3uService(
      {},
      {
        on: () => {},
      }
    );

    const m3u = service.replaceHostOnM3u(
      'http://provider.example:8000',
      [
        '#EXTM3U url-tvg="{{host}}/xmltv.xml"',
        '#EXTINF:0 tvg-logo="http://127.0.0.1:8000/images/ayoitson.png",Ayoitson',
        '{{host}}/video?channel=1',
      ].join('\n')
    );

    expect(m3u).toContain('http://provider.example:8000/xmltv.xml');
    expect(m3u).toContain('http://provider.example:8000/images/ayoitson.png');
    expect(m3u).not.toContain('http://127.0.0.1:8000');
  });

  test('the authenticated API guide route remains protected', async () => {
    const response = await request(createProviderApp()).get(
      '/api/guide/xmltv.xml'
    );

    expect(response.status).toBe(401);
  });
});
