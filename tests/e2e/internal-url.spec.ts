const EventEmitter = require('events');
const express = require('express');
const { expect, request, test } = require('@playwright/test');
const api = require('../../src/api');
const OfflinePlayer = require('../../src/offline-player');
const M3uService = require('../../src/services/m3u-service');

function collection(rows = []) {
  return {
    find: () => rows,
    update: () => {},
    save: () => {},
    remove: () => {},
    load: () => {},
  };
}

function ffmpegSettings() {
  return {
    audioVolumePercent: 100,
    enableFFMPEGTranscoding: false,
    ffmpegPath: 'ffmpeg',
    normalizeAudio: false,
    normalizeAudioCodec: false,
    normalizeResolution: false,
    normalizeVideoCodec: false,
    targetResolution: '1920x1080',
  };
}

function createChannelService() {
  const channelService = new EventEmitter();
  channelService.getAllChannels = async () => [
    {
      number: 1,
      name: 'Internal URL Test',
      groupTitle: 'Ayoitson',
      icon: '',
    },
  ];
  channelService.getAllChannelNumbers = async () => [1];
  channelService.getChannel = async () => ({
    number: 1,
    name: 'Internal URL Test',
    transcoding: {},
  });
  channelService.saveChannel = async () => {};
  channelService.deleteChannel = async () => {};
  return channelService;
}

function createApp() {
  const app = express();
  const channelService = createChannelService();
  const fileCacheService = {
    getCache: async () => undefined,
    setCache: async () => {},
  };
  const m3uService = new M3uService(fileCacheService, channelService);
  const db = new Proxy(
    {},
    {
      get: (target, key) => {
        if (key === 'ffmpeg-settings') {
          return collection([ffmpegSettings()]);
        }

        return collection([{ _id: 'fixture' }]);
      },
    }
  );

  app.use(
    api.compose({
      db,
      channelService,
      fillerDB: {
        getAllFillersInfo: async () => [],
        getFiller: async () => undefined,
      },
      customShowDB: {
        getAllShowsInfo: async () => [],
        getShow: async () => undefined,
      },
      xmltvInterval: {
        lastUpdated: new Date(0),
        updateXML: () => {},
        restartInterval: () => {},
      },
      guideService: {
        get: async () => ({}),
        getStatus: async () => ({}),
        getChannelLineup: async () => [],
      },
      m3uService,
      eventService: {
        push: () => {},
      },
      ffmpegSettingsService: {
        get: () => ffmpegSettings(),
        update: () => ({ ffmpeg: ffmpegSettings() }),
        reset: () => ffmpegSettings(),
      },
    })
  );

  app.get('/test/offline-player/loading-picture', (req, res) => {
    const player = new OfflinePlayer(false, {
      audioOnly: false,
      channel: {
        number: 1,
        name: 'Internal URL Test',
        transcoding: {},
      },
      ffmpegSettings: ffmpegSettings(),
      isLoading: true,
      lineupItem: {
        start: 0,
        streamDuration: 60000,
      },
      req,
    });

    res.type('text').send(player.context.channel.offlinePicture);
  });

  return app;
}

async function listen(app) {
  const server = await new Promise((resolve) => {
    const runningServer = app.listen(0, '127.0.0.1', () => {
      resolve(runningServer);
    });
  });
  const address = server.address();

  return {
    baseURL: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

test.describe('INTERNAL_URL streaming output', () => {
  let previousInternalUrl;

  test.beforeEach(() => {
    previousInternalUrl = process.env.INTERNAL_URL;
    process.env.INTERNAL_URL = 'http://192.0.2.1:8000';
  });

  test.afterEach(() => {
    if (typeof previousInternalUrl === 'undefined') {
      delete process.env.INTERNAL_URL;
    } else {
      process.env.INTERNAL_URL = previousInternalUrl;
    }
  });

  test('M3U and offline-player image URLs use the configured internal URL', async () => {
    const server = await listen(createApp());
    const context = await request.newContext({
      baseURL: server.baseURL,
    });

    try {
      const m3uResponse = await context.get('/api/guide/channels.m3u');
      const m3u = await m3uResponse.text();

      expect(m3uResponse.status()).toBe(200);
      expect(m3u).toContain('192.0.2.1');
      expect(m3u).not.toContain('localhost');

      const offlineResponse = await context.get(
        '/test/offline-player/loading-picture'
      );
      const offlinePicture = await offlineResponse.text();

      expect(offlineResponse.status()).toBe(200);
      expect(offlinePicture).toBe(
        'http://192.0.2.1:8000/images/loading-screen.png'
      );
      expect(offlinePicture).not.toContain('localhost');
    } finally {
      await context.dispose();
      await server.close();
    }
  });
});
