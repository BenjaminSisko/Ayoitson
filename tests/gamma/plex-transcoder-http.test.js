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
      directStreamBitrate: 10000,
      enableSubtitles: false,
      forceDirectPlay: false,
      maxAudioChannels: 2,
      maxPlayableResolution: '1920x1080',
      maxTranscodeResolution: '1920x1080',
      mediaBufferSize: 100,
      pathReplace: '',
      pathReplaceWith: '',
      streamPath: 'plex',
      streamProtocol: 'hls',
      transcodeBitrate: 8000,
      transcodeMediaBufferSize: 200,
      updatePlayStatus: false,
      audioBoost: 100,
      audioCodecs: 'aac',
      videoCodecs: 'h264',
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
    expect(url).toBe('http://93.184.216.34:32400/library/metadata/1');
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('manual');
    expect(init.headers.Accept).toBe('application/json');
    expect(init.headers['X-Plex-Token']).toBe('plex-token');
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
    expect(url).not.toContain('X-Plex-Token=plex-token');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    expect(init.headers['X-Plex-Token']).toBe('plex-token');
  });

  test('transcode URLs and FFmpeg inputs carry Plex token as header only', () => {
    const transcoder = createTranscoder();

    transcoder.setTranscodingArgs(false, true, false, false);
    const input = transcoder.getFfmpegPlexInput(
      `http://93.184.216.34:32400/video/:/transcode/universal/start.m3u8?${transcoder.transcodingArgs}`
    );

    expect(transcoder.transcodingArgs).not.toContain('X-Plex-Token');
    expect(input.url).not.toContain('X-Plex-Token');
    expect(input.headers['X-Plex-Token']).toBe('plex-token');
  });

  test('transcode and timeline URLs do not include control whitespace', () => {
    const transcoder = createTranscoder();

    transcoder.setTranscodingArgs(false, true, false, false);
    const transcodeUrl = `${transcoder.transcodeUrlBase}${transcoder.transcodingArgs}`;
    const transcodeParams = new URL(transcodeUrl).searchParams;
    const statusUrl = transcoder.getStatusUrl();
    const statusParams = new URL(statusUrl).searchParams;

    expect(transcoder.transcodingArgs).not.toMatch(/\s/);
    expect(statusUrl).not.toMatch(/\s/);
    expect(transcodeParams.get('X-Plex-Device')).toBe('channel-7');
    expect(transcodeParams.get('path')).toBe('/library/metadata/1');
    expect(transcodeParams.get('X-Plex-Client-Profile-Extra')).toContain(
      'add-transcode-target('
    );
    expect(statusParams.get('containerKey')).toContain(
      '/video/:/transcode/universal/decision?'
    );
    expect(statusParams.get('X-Plex-Device')).toBe('channel-7');
  });

  test('metadata requests may reach an explicitly configured private Plex host', async () => {
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
    const transcoder = new PlexTranscoder(
      'client-id',
      {
        uri: 'https://192.168.1.117:32400',
        accessToken: 'plex-token',
      },
      {
        ...createTranscoder().settings,
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

    const data = await transcoder.getDirectInfo();
    const [url, init] = global.fetch.mock.calls[0];

    expect(data.MediaContainer.Metadata[0].ratingKey).toBe('1');
    expect(url).toBe('https://192.168.1.117:32400/library/metadata/1');
    expect(init.headers['X-Plex-Token']).toBe('plex-token');
  });

  test('MDE failures reject with Plex decision details', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          MediaContainer: {
            mdeDecisionCode: 2000,
            mdeDecisionText: 'No playable media',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    });
    const transcoder = createTranscoder();
    transcoder.setTranscodingArgs(false, true, false, false);

    await expect(transcoder.getDecisionUnmanaged(false)).rejects.toThrow(
      /Plex MDE decision failed \(2000\): No playable media/
    );
  });
});
