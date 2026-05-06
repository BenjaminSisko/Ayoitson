const fs = require('fs');
const os = require('os');
const path = require('path');
const { httpGet, httpPost, __test } = require('../../src/lib/http');

const PUBLIC_ADDRESS = '93.184.216.34';

function resolveTo(address) {
  return async () => [{ address, family: address.includes(':') ? 6 : 4 }];
}

function resolverSequence(addresses) {
  let index = 0;

  return async () => {
    const address = addresses[Math.min(index, addresses.length - 1)];
    index += 1;
    return [{ address, family: address.includes(':') ? 6 : 4 }];
  };
}

describe('Phase 2 SSRF-defended HTTP wrapper', () => {
  test('rejects AWS metadata link-local addresses before fetch', async () => {
    const fetchImpl = vi.fn();

    await expect(
      httpGet('http://169.254.169.254/latest/meta-data', {
        allowlist: ['http://169.254.169.254'],
        fetchImpl,
      })
    ).rejects.toThrow(/private address 169\.254\.169\.254/);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects localhost service targets before fetch', async () => {
    const fetchImpl = vi.fn();

    await expect(
      httpGet('http://localhost:6379/', {
        allowlist: ['http://localhost:6379'],
        fetchImpl,
        resolveHost: resolveTo('127.0.0.1'),
      })
    ).rejects.toThrow(/private address 127\.0\.0\.1/);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects RFC1918 private address targets before fetch', async () => {
    const fetchImpl = vi.fn();

    await expect(
      httpGet('http://10.0.0.1/', {
        allowlist: ['http://10.0.0.1'],
        fetchImpl,
      })
    ).rejects.toThrow(/private address 10\.0\.0\.1/);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects IPv6 loopback and ULA literals before fetch', async () => {
    const fetchImpl = vi.fn();

    await expect(
      httpGet('http://[::1]/', {
        allowlist: ['http://[::1]'],
        fetchImpl,
      })
    ).rejects.toThrow(/private address ::1/);

    await expect(
      httpGet('http://[fd00::1]/', {
        allowlist: ['http://[fd00::1]'],
        fetchImpl,
      })
    ).rejects.toThrow(/private address fd00::1/);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('allows configured Plex server URIs', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-http-'));
    fs.writeFileSync(
      path.join(tempRoot, 'plex-servers.json'),
      JSON.stringify([{ name: 'plex', uri: 'http://plex.example:32400' }])
    );

    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    try {
      const response = await httpGet('http://plex.example:32400/status', {
        databaseDir: tempRoot,
        fetchImpl,
        resolveHost: resolveTo(PUBLIC_ADDRESS),
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ ok: true });
      expect(fetchImpl).toHaveBeenCalledWith(
        'http://plex.example:32400/status',
        expect.objectContaining({
          method: 'GET',
          redirect: 'manual',
        })
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('httpPost sends JSON with manual redirects disabled', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, { status: 204 });
    });

    const response = await httpPost('https://plex.tv/api/resources', {
      fetchImpl,
      json: { ping: true },
      resolveHost: resolveTo(PUBLIC_ADDRESS),
    });
    const [, init] = fetchImpl.mock.calls[0];

    expect(response.status).toBe(204);
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    expect(init.headers['content-type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ ping: true }));
  });

  test('timeout aborts the request', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener(
          'abort',
          () => reject(init.signal.reason),
          {
            once: true,
          }
        );
      });
    });

    await expect(
      httpGet('https://plex.tv/api/resources', {
        fetchImpl,
        resolveHost: resolveTo(PUBLIC_ADDRESS),
        timeoutMs: 5,
      })
    ).rejects.toThrow(/timed out after 5ms/);
  });

  test('redirects to private IPs are rejected', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response('', {
        status: 302,
        headers: {
          location: 'http://169.254.169.254/latest/meta-data',
        },
      });
    });

    await expect(
      httpGet('https://plex.tv/api/resources', {
        fetchImpl,
        resolveHost: resolveTo(PUBLIC_ADDRESS),
      })
    ).rejects.toThrow(/private address 169\.254\.169\.254/);
  });

  test('DNS rebinding is rejected by re-resolving after fetch', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response('ok', { status: 200 });
    });

    await expect(
      httpGet('https://plex.tv/api/resources', {
        fetchImpl,
        resolveHost: resolverSequence([PUBLIC_ADDRESS, '10.0.0.8']),
      })
    ).rejects.toThrow(/private address 10\.0\.0\.8/);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('responses over the configured size cap are rejected', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response('too large', { status: 200 });
    });

    await expect(
      httpGet('https://plex.tv/api/resources', {
        fetchImpl,
        maxBytes: 4,
        resolveHost: resolveTo(PUBLIC_ADDRESS),
      })
    ).rejects.toThrow(/exceeds 4 bytes/);
  });

  test('sensitive request headers are redacted in error details', async () => {
    await expect(
      httpGet('http://10.0.0.1/', {
        allowlist: ['http://10.0.0.1'],
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer secret',
          'X-API-Key': 'api-secret',
          'X-Plex-Token': 'plex-secret',
        },
      })
    ).rejects.toMatchObject({
      details: {
        request: {
          headers: {
            Accept: 'application/json',
            Authorization: '[redacted]',
            'X-API-Key': '[redacted]',
            'X-Plex-Token': '[redacted]',
          },
        },
      },
    });

    expect(
      __test.redactHeaders({
        Authorization: 'Bearer secret',
        'X-API-Key': 'api-secret',
        'X-Plex-Token': 'plex-secret',
      })
    ).toEqual({
      Authorization: '[redacted]',
      'X-API-Key': '[redacted]',
      'X-Plex-Token': '[redacted]',
    });
  });
});
