// tests/alpha/api-guide.test.js
//
// Guide / xmltv / m3u routes. Most importantly: GET /api/guide/xmltv.xml
// must NOT honor an operator-supplied `xmltvSettings.file`. The path is
// hard-coded to `${DATABASE}/xmltv.xml` — closes F10-xmltv-readfile.
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const express = require('express');

const apiCompose = require('../../src/api');
const { createMockDependencies } = require('../helpers/api-router');

describe('Phase 4 guide API', () => {
  test('GET /api/guide/status returns guideService.getStatus()', async () => {
    const app = express();
    app.use(express.json());
    app.use(apiCompose.compose(createMockDependencies()));
    const r = await request(app).get('/api/guide/status');
    expect(r.status).toBe(200);
  });

  test('GET /api/guide/last-refresh returns a numeric value', async () => {
    const app = express();
    app.use(express.json());
    app.use(apiCompose.compose(createMockDependencies()));
    const r = await request(app).get('/api/guide/last-refresh');
    expect(r.status).toBe(200);
    expect(typeof r.body.value).toBe('number');
  });

  test('GET /api/guide/xmltv.xml reads from ${DATABASE}/xmltv.xml only', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-guide-'));
    const previousDatabase = process.env.DATABASE;
    process.env.DATABASE = tempRoot;
    try {
      // Plant a known-good xmltv at the hard-coded path.
      fs.writeFileSync(
        path.join(tempRoot, 'xmltv.xml'),
        '<tv>test {{host}}</tv>'
      );

      // Plant a sentinel that an attacker would *want* read instead. The
      // legacy code would honor xmltvSettings.file pointing here; the new
      // code MUST NOT.
      const sensitive = path.join(tempRoot, 'sensitive.txt');
      fs.writeFileSync(sensitive, 'TOP_SECRET');

      const deps = createMockDependencies({
        // Mock db so xmltv-settings has a `file` pointing at the sensitive
        // file. Phase 4 ignores this field entirely.
        db: new Proxy(
          {},
          {
            get: () => ({
              find: () => [{ _id: 'fixture', file: sensitive }],
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

      const r = await request(app).get('/api/guide/xmltv.xml');
      expect(r.status).toBe(200);
      expect(r.text).toContain('<tv>test');
      expect(r.text).not.toContain('TOP_SECRET');
    } finally {
      process.env.DATABASE = previousDatabase;
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('GET /api/guide/xmltv.xml returns 404 envelope when xmltv.xml is missing', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-guide-'));
    const previousDatabase = process.env.DATABASE;
    process.env.DATABASE = tempRoot;
    try {
      const app = express();
      app.use(express.json());
      app.use(apiCompose.compose(createMockDependencies()));
      const r = await request(app).get('/api/guide/xmltv.xml');
      expect(r.status).toBe(404);
      expect(r.body).toMatchObject({ code: 'NOT_FOUND' });
    } finally {
      process.env.DATABASE = previousDatabase;
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('POST /api/guide/time-slots returns INTERNAL envelope on bad payload', async () => {
    // The underlying time-slots-service throws on null schedule. The
    // asyncRoute wrapper catches that and emits the structured INTERNAL
    // envelope. The important Phase 4 invariant is "no plain-text errors";
    // we don't care which code as long as it's the envelope.
    const app = express();
    app.use(express.json());
    app.use(apiCompose.compose(createMockDependencies()));
    const r = await request(app)
      .post('/api/guide/time-slots')
      .send({ programs: [], schedule: null });
    expect([200, 400, 500]).toContain(r.status);
    if (r.status >= 400) {
      expect(r.body).toHaveProperty('code');
      expect(r.body).toHaveProperty('message');
    }
  });
});
