// tests/alpha/tv-guide-xmltv-path.test.js
// — Codex (OpenAI), Lane Alpha · 2026-05-06

const fs = require('fs');
const os = require('os');
const path = require('path');

const TVGuideService = require('../../src/services/tv-guide-service');

describe('TV guide XMLTV writer path', () => {
  test('refreshXML ignores migrated xmltvSettings.file and writes to ${DATABASE}/xmltv.xml', async () => {
    const originalDatabase = process.env.DATABASE;
    const originalEventService = global.eventService;
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-xmltv-'));
    process.env.DATABASE = tempRoot;
    global.eventService = { push: () => {} };

    const writtenSettings = [];
    const xmltv = {
      WriteXMLTV: async (_cached, xmltvSettings) => {
        writtenSettings.push(xmltvSettings);
      },
    };
    const db = {
      'xmltv-settings': {
        find: () => [
          {
            _id: 'xmltv',
            cache: 12,
            refresh: 4,
            file: '/etc/passwd',
          },
        ],
      },
    };

    try {
      const service = new TVGuideService(xmltv, db, null, null, {
        t: () => 'XMLTV updated',
      });
      service.cached = {};

      await service.refreshXML();

      expect(writtenSettings).toHaveLength(1);
      expect(writtenSettings[0]).toMatchObject({
        cache: 12,
        refresh: 4,
        file: path.join(tempRoot, 'xmltv.xml'),
      });
    } finally {
      process.env.DATABASE = originalDatabase;
      global.eventService = originalEventService;
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
