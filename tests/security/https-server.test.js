const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');

const { createAyoitsonServer } = require('../../src/lib/server');

describe('server protocol selection', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-tls-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('creates an HTTP server by default', () => {
    const result = createAyoitsonServer((_req, res) => res.end('ok'), {
      env: {},
    });
    expect(result.protocol).toBe('http');
    expect(result.server).toBeInstanceOf(http.Server);
  });

  test('requires cert and key to be set together', () => {
    expect(() =>
      createAyoitsonServer(() => {}, { env: { HTTPS_CERT: '/tmp/cert' } })
    ).toThrow(/HTTPS_CERT and HTTPS_KEY/);
  });

  test('creates an HTTPS server when cert and key are provided', () => {
    const certPath = path.join(tempDir, 'cert.pem');
    const keyPath = path.join(tempDir, 'key.pem');
    fs.writeFileSync(certPath, 'certificate');
    fs.writeFileSync(keyPath, 'private-key');
    const fakeServer = { listen: vi.fn() };
    const spy = vi.spyOn(https, 'createServer').mockReturnValue(fakeServer);

    const result = createAyoitsonServer((_req, res) => res.end('ok'), {
      env: { HTTPS_CERT: certPath, HTTPS_KEY: keyPath },
    });

    expect(result.protocol).toBe('https');
    expect(result.server).toBe(fakeServer);
    expect(spy).toHaveBeenCalledWith(
      {
        cert: Buffer.from('certificate'),
        key: Buffer.from('private-key'),
      },
      expect.any(Function)
    );
    spy.mockRestore();
  });
});
