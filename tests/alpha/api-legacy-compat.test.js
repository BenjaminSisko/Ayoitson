// tests/alpha/api-legacy-compat.test.js
// — Codex (OpenAI), Lane Alpha · 2026-05-06

const express = require('express');
const request = require('supertest');

const apiCompose = require('../../src/api');
const {
  createApiApp,
  createMockDependencies,
} = require('../helpers/api-router');

function statefulCollection(rows = []) {
  return {
    rows,
    find(query) {
      if (!query || Object.keys(query).length === 0) return this.rows;
      return this.rows.filter((row) =>
        Object.entries(query).every(([key, value]) => row[key] === value)
      );
    },
    update(query, value) {
      const match = this.rows.find((row) =>
        Object.entries(query).every(([key, expected]) => row[key] === expected)
      );
      if (match) {
        Object.keys(match).forEach((key) => delete match[key]);
        Object.assign(match, value);
      } else {
        this.rows.push(value);
      }
    },
    save(value) {
      this.rows.push(value);
    },
    remove(query) {
      this.rows = this.rows.filter(
        (row) =>
          !Object.entries(query).every(([key, value]) => row[key] === value)
      );
    },
    load: () => {},
  };
}

function appForDeps(deps) {
  const app = express();
  app.use(express.json());
  app.use(apiCompose.compose(deps));
  return app;
}

describe('legacy AngularJS API compatibility routes', () => {
  test('legacy channel paths translate to Phase 4 channel handlers', async () => {
    const app = createApiApp();

    const numbers = await request(app).get('/api/channelNumbers');
    expect(numbers.status).toBe(200);
    expect(numbers.body).toEqual([1]);

    const description = await request(app).get('/api/channel/description/1');
    expect(description.status).toBe(200);
    expect(description.body).toMatchObject({
      number: 1,
      name: 'Existing Channel',
    });

    const programless = await request(app).get('/api/channel/programless/1');
    expect(programless.status).toBe(200);
    expect(programless.body).not.toHaveProperty('programs');
  });

  test('legacy channel mutators keep the old body-number contract', async () => {
    const app = createApiApp();

    const created = await request(app)
      .post('/api/channel')
      .send({ number: 7, name: 'Legacy Created', programs: [] });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ number: 7 });

    const updated = await request(app)
      .put('/api/channel')
      .send({ number: 7, name: 'Legacy Updated', programs: [] });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ number: 7 });

    const read = await request(app).get('/api/channel/7');
    expect(read.body).toMatchObject({ name: 'Legacy Updated' });

    const removed = await request(app)
      .delete('/api/channel')
      .send({ number: 7 });
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ number: 7 });
  });

  test('legacy settings paths return the AngularJS shapes without accepting xmltv.file', async () => {
    const originalDatabase = process.env.DATABASE;
    const originalAyoitsonDatabase = process.env.AYOITSON_DATABASE;
    const originalInternalUrl = process.env.INTERNAL_URL;
    process.env.DATABASE = '/tmp/ayoitson-test-db';
    delete process.env.AYOITSON_DATABASE;
    process.env.INTERNAL_URL = 'http://provider.example:8000';
    const stores = {
      'plex-settings': statefulCollection([
        { _id: 'plex', streamPath: 'plex' },
      ]),
      'xmltv-settings': statefulCollection([
        {
          _id: 'xmltv',
          cache: 12,
          refresh: 4,
          file: '/etc/passwd',
          enableImageCache: false,
        },
      ]),
      'hdhr-settings': statefulCollection([
        { _id: 'hdhr', tunerCount: 1, autoDiscovery: true },
      ]),
    };
    const deps = createMockDependencies({
      db: new Proxy(
        {},
        {
          get(_target, prop) {
            return (
              stores[prop] ||
              statefulCollection([{ _id: String(prop), ffmpegPath: 'ffmpeg' }])
            );
          },
        }
      ),
    });
    const app = appForDeps(deps);

    try {
      const ffmpeg = await request(app).get('/api/ffmpeg-settings');
      expect(ffmpeg.status).toBe(200);
      expect(ffmpeg.body).toMatchObject({ ffmpegPath: 'ffmpeg' });

      const xmltv = await request(app).get('/api/xmltv-settings');
      expect(xmltv.status).toBe(200);
      expect(xmltv.body.file).toBe('/tmp/ayoitson-test-db/xmltv.xml');
      expect(xmltv.body.xmltvUrl).toBe(
        'http://provider.example:8000/xmltv.xml'
      );
      expect(xmltv.body.m3uUrl).toBe(
        'http://provider.example:8000/channels.m3u'
      );

      const updatedXmltv = await request(app).put('/api/xmltv-settings').send({
        _id: 'xmltv',
        cache: 6,
        refresh: 2,
        file: '/etc/shadow',
        enableImageCache: true,
      });
      expect(updatedXmltv.status).toBe(200);
      expect(updatedXmltv.body).toMatchObject({
        cache: 6,
        refresh: 2,
        enableImageCache: true,
        file: '/tmp/ayoitson-test-db/xmltv.xml',
      });
      expect(stores['xmltv-settings'].rows[0]).not.toHaveProperty('file');
    } finally {
      process.env.DATABASE = originalDatabase;
      if (typeof originalAyoitsonDatabase === 'undefined') {
        delete process.env.AYOITSON_DATABASE;
      } else {
        process.env.AYOITSON_DATABASE = originalAyoitsonDatabase;
      }
      if (typeof originalInternalUrl === 'undefined') {
        delete process.env.INTERNAL_URL;
      } else {
        process.env.INTERNAL_URL = originalInternalUrl;
      }
    }
  });

  test('legacy filler and custom-show aliases preserve old verbs', async () => {
    const app = createApiApp();

    expect((await request(app).get('/api/fillers')).status).toBe(200);
    expect((await request(app).get('/api/filler/fixture')).status).toBe(200);
    expect(
      (await request(app).post('/api/filler/fixture').send({ name: 'F' }))
        .status
    ).toBe(204);
    expect(
      (await request(app).put('/api/filler').send({ name: 'F' })).status
    ).toBe(201);

    expect((await request(app).get('/api/shows')).status).toBe(200);
    expect((await request(app).get('/api/show/fixture')).status).toBe(200);
    expect(
      (await request(app).post('/api/show/fixture').send({ name: 'S' })).status
    ).toBe(204);
    expect(
      (await request(app).put('/api/show').send({ name: 'S' })).status
    ).toBe(201);
  });

  test('legacy Plex server methods bridge old UI verbs', async () => {
    const plexServers = statefulCollection([
      {
        _id: 'plex-a',
        name: 'plex',
        uri: 'http://old.example',
        accessToken: 'secret',
        index: 0,
      },
    ]);
    const deps = createMockDependencies({
      db: new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === 'plex-servers') return plexServers;
            return statefulCollection([{ _id: String(prop) }]);
          },
        }
      ),
      channelService: {
        getChannel: async () => null,
        getAllChannels: async () => [],
        getAllChannelNumbers: async () => [],
        saveChannel: async () => {},
        deleteChannel: async () => {},
      },
      fillerDB: {
        getAllFillersInfo: async () => [],
        getAllFillers: async () => [],
        getFiller: async () => null,
        saveFiller: async () => {},
        createFiller: async () => 'fixture',
        deleteFiller: async () => {},
        getFillerChannels: async () => [],
      },
      customShowDB: {
        getAllShowsInfo: async () => [],
        getAllShows: async () => [],
        getShow: async () => null,
        saveShow: async () => {},
        createShow: async () => 'fixture',
        deleteShow: async () => {},
      },
    });
    const app = appForDeps(deps);

    const update = await request(app).post('/api/plex-servers').send({
      name: 'plex',
      uri: 'http://new.example',
      accessToken: 'replacement',
    });
    expect(update.status).toBe(204);
    expect(plexServers.rows[0]).toMatchObject({ uri: 'http://new.example' });

    const create = await request(app).put('/api/plex-servers').send({
      name: 'plex',
      uri: 'http://created.example',
      accessToken: 'created',
    });
    expect(create.status).toBe(201);
    expect(plexServers.rows.map((row) => row.name)).toContain('plex2');

    const remove = await request(app)
      .delete('/api/plex-servers')
      .send({ name: 'plex' });
    expect(remove.status).toBe(200);
    expect(remove.body).toEqual([]);
    expect(plexServers.rows.map((row) => row.name)).not.toContain('plex');
  });
});
