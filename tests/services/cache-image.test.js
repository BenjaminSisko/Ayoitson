const fs = require('fs');
const os = require('os');
const path = require('path');
const CacheImageService = require('../../src/services/cache-image-service');

const PUBLIC_PLEX_IMAGE_URL = 'http://93.184.216.34:32400/library/thumb/1';

function createService(tempRoot, update = vi.fn()) {
  return {
    service: new CacheImageService(
      {
        'cache-images': {
          find: () => [],
          save: () => {},
          update,
        },
      },
      {
        cachePath: tempRoot,
      }
    ),
    update,
  };
}

describe('Phase 2 cache-image HTTP wrapper migration', () => {
  let previousAyoitsonDatabase;
  let previousDatabase;
  let previousFetch;
  let tempRoot;

  beforeEach(() => {
    previousAyoitsonDatabase = process.env.AYOITSON_DATABASE;
    previousDatabase = process.env.DATABASE;
    previousFetch = global.fetch;
    delete process.env.AYOITSON_DATABASE;
    delete process.env.DATABASE;
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-cache-'));
    fs.mkdirSync(path.join(tempRoot, 'images'), { recursive: true });
  });

  afterEach(() => {
    restoreEnv('AYOITSON_DATABASE', previousAyoitsonDatabase);
    restoreEnv('DATABASE', previousDatabase);
    global.fetch = previousFetch;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('rejects attacker-controlled metadata-service URLs before fetch', async () => {
    global.fetch = vi.fn();
    const { service, update } = createService(tempRoot);
    const encodedUrl = Buffer.from(
      'http://169.254.169.254/latest/meta-data'
    ).toString('base64');

    await expect(
      service.requestImageAndStore('http://169.254.169.254/latest/meta-data', {
        _id: 'fixture',
        url: encodedUrl,
      })
    ).rejects.toThrow(/private address 169\.254\.169\.254/);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  test('stores allowlisted Plex images through the HTTP wrapper', async () => {
    process.env.AYOITSON_DATABASE = tempRoot;
    fs.writeFileSync(
      path.join(tempRoot, 'plex-servers.json'),
      JSON.stringify([{ name: 'plex', uri: 'http://93.184.216.34:32400' }])
    );
    global.fetch = vi.fn(async () => {
      return new Response('image-bytes', {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    });
    const { service, update } = createService(tempRoot);
    const encodedUrl = Buffer.from(PUBLIC_PLEX_IMAGE_URL).toString('base64');

    const mimeType = await service.requestImageAndStore(PUBLIC_PLEX_IMAGE_URL, {
      _id: 'fixture',
      url: encodedUrl,
    });

    expect(mimeType).toBe('image/png');
    expect(update).toHaveBeenCalledWith(
      { _id: 'fixture' },
      { url: encodedUrl, mimeType: 'image/png' }
    );
    expect(
      fs.readFileSync(path.join(tempRoot, 'images', encodedUrl), 'utf8')
    ).toBe('image-bytes');
  });
});

function restoreEnv(name, value) {
  if (typeof value === 'undefined') {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
