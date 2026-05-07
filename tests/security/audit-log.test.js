const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const {
  createAuditLogger,
  sanitizeAuditValue,
  writeRequestAudit,
} = require('../../src/lib/audit');
const { createApiApp } = require('../helpers/api-router');

describe('audit log', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-audit-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('redacts token-shaped fields recursively', () => {
    expect(
      sanitizeAuditValue({
        name: 'plex',
        accessToken: 'secret',
        nested: { apiKey: 'secret', ok: true },
      })
    ).toEqual({
      name: 'plex',
      accessToken: '[REDACTED]',
      nested: { apiKey: '[REDACTED]', ok: true },
    });
  });

  test('writes json-lines entries and reads the newest entries', () => {
    const logger = createAuditLogger({
      databaseDir: tempDir,
      now: () => new Date('2026-05-07T00:00:00.000Z'),
    });

    expect(logger.write('auth.failure', { detail: { reason: 'bad' } })).toBe(
      true
    );
    expect(
      logger.write('settings.changed', { detail: { section: 'plex' } })
    ).toBe(true);

    expect(logger.readRecent({ limit: 1 })).toEqual([
      {
        ts: '2026-05-07T00:00:00.000Z',
        event: 'settings.changed',
        detail: { section: 'plex' },
      },
    ]);
    expect(fs.statSync(logger.filePath).mode & 0o777).toBe(0o600);
  });

  test('rotates audit.log when it exceeds the configured size', () => {
    const logger = createAuditLogger({
      databaseDir: tempDir,
      maxBytes: 80,
    });

    logger.write('channel.created', { detail: { number: 1 } });
    logger.write('channel.updated', { detail: { number: 1 } });

    const files = fs.readdirSync(tempDir);
    expect(files).toContain('audit.log');
    expect(files.some((name) => name.startsWith('audit.log.'))).toBe(true);
  });

  test('writeRequestAudit captures actor metadata without raw key material', () => {
    const logger = createAuditLogger({ databaseDir: tempDir });
    writeRequestAudit(
      logger,
      {
        apiKey: { id: 'abc', name: 'operator' },
        get: () => 'agent',
        ip: '127.0.0.1',
        method: 'POST',
        originalUrl: '/api/channels',
      },
      'channel.created',
      { apiKey: 'secret', number: 1 }
    );

    expect(logger.readRecent({ limit: 1 })[0]).toMatchObject({
      event: 'channel.created',
      actor: { type: 'api-key', id: 'abc', name: 'operator' },
      detail: { apiKey: '[REDACTED]', number: 1 },
    });
  });

  test('GET /api/audit-log returns recent entries', async () => {
    const logger = createAuditLogger({ databaseDir: tempDir });
    logger.write('settings.changed', { detail: { section: 'xmltv' } });

    const r = await request(createApiApp({ auditLogger: logger }))
      .get('/api/audit-log')
      .query({ limit: 10 });

    expect(r.status).toBe(200);
    expect(r.body.path).toBe(logger.filePath);
    expect(r.body.entries).toHaveLength(1);
    expect(r.body.entries[0]).toMatchObject({
      event: 'settings.changed',
      detail: { section: 'xmltv' },
    });
  });
});
