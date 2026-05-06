const PlexTranscoder = require('../../src/plexTranscoder');

function createTranscoder() {
  return new PlexTranscoder(
    'client-id',
    {
      uri: 'http://93.184.216.34:32400',
      accessToken: 'plex-token',
    },
    {
      debugLogging: false,
    },
    {
      number: 7,
    },
    {
      key: '/library/metadata/1',
      plexFile: '/library/parts/1/file.mp4',
      ratingKey: '1',
      start: 0,
      duration: 60000,
    }
  );
}

describe('Phase 2 PlexTranscoder HTTP wrapper migration', () => {
  let previousFetch;

  beforeEach(() => {
    previousFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = previousFetch;
  });

  test('metadata requests use native fetch through the HTTP wrapper', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          MediaContainer: {
            Metadata: [{ ratingKey: '1' }],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    });
    const transcoder = createTranscoder();

    const data = await transcoder.getDirectInfo();
    const [url, init] = global.fetch.mock.calls[0];

    expect(data.MediaContainer.Metadata[0].ratingKey).toBe('1');
    expect(url).toBe(
      'http://93.184.216.34:32400/library/metadata/1?X-Plex-Token=plex-token'
    );
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('manual');
    expect(init.headers.Accept).toBe('application/json');
  });

  test('timeline updates post through the HTTP wrapper', async () => {
    global.fetch = vi.fn(async () => {
      return new Response('', { status: 200 });
    });
    const transcoder = createTranscoder();
    transcoder.transcodingArgs = 'path=%2Flibrary%2Fmetadata%2F1';
    transcoder.playState = 'playing';

    await transcoder.updatePlex();
    const [url, init] = global.fetch.mock.calls[0];

    expect(url).toContain('http://93.184.216.34:32400/:/timeline?');
    expect(url).toContain('X-Plex-Token=plex-token');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
  });
});
