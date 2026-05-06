const express = require('express');
const fileUpload = require('express-fileupload');
const api = require('../../src/api');

function collection(rows = []) {
  return {
    find: () => rows,
    update: () => {},
    save: () => {},
    remove: () => {},
    load: () => {},
  };
}

function createMockDependencies() {
  const db = new Proxy(
    {},
    {
      get: () => collection([{ _id: 'fixture', ffmpegPath: 'ffmpeg' }]),
    }
  );

  const channelService = {
    getChannel: async () => ({ number: 1, name: 'Test Channel' }),
    getAllChannels: async () => [],
    getAllChannelNumbers: async () => [1],
    saveChannel: async () => {},
    deleteChannel: async () => {},
  };

  const fillerDB = {
    getAllFillersInfo: async () => [],
    getFiller: async () => ({ id: 'fixture' }),
    saveFiller: async () => {},
    deleteFiller: async () => {},
    getChannelsUsingFiller: async () => [],
  };

  const customShowDB = {
    getAllShowsInfo: async () => [],
    getShow: async () => ({ id: 'fixture' }),
    saveShow: async () => {},
    deleteShow: async () => {},
  };

  return {
    db,
    channelService,
    fillerDB,
    customShowDB,
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
    m3uService: {
      getChannelList: async () => '',
    },
    eventService: {
      push: () => {},
    },
    ffmpegSettingsService: {
      get: () => ({ ffmpegPath: 'ffmpeg' }),
      update: () => ({ ffmpeg: { ffmpegPath: 'ffmpeg' } }),
      reset: () => ({ ffmpegPath: 'ffmpeg' }),
    },
  };
}

function createApiRouter() {
  const deps = createMockDependencies();
  return api.router(
    deps.db,
    deps.channelService,
    deps.fillerDB,
    deps.customShowDB,
    deps.xmltvInterval,
    deps.guideService,
    deps.m3uService,
    deps.eventService,
    deps.ffmpegSettingsService
  );
}

function createUploadApp() {
  const app = express();
  app.use(
    fileUpload({
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
      abortOnLimit: true,
      safeFileNames: true,
      preserveExtension: true,
    })
  );
  app.use(createApiRouter());
  return app;
}

function routeInventory(router) {
  return router.stack
    .filter((layer) => layer.route && layer.route.path.startsWith('/api/'))
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((method) => ({
        method,
        path: layer.route.path,
        layer,
      }))
    );
}

function urlForRoute(routePath) {
  return routePath.replace(/:number/g, '1').replace(/:id/g, 'fixture');
}

function createAuthProbeApp() {
  const router = createApiRouter();
  for (const route of routeInventory(router)) {
    const handlers = route.layer.route.stack;
    const lastHandler = handlers[handlers.length - 1];
    lastHandler.handle = (req, res) => {
      res.status(204).send();
    };
  }

  const app = express();
  app.use(express.json());
  app.use(router);

  return {
    app,
    routes: routeInventory(router),
  };
}

module.exports = {
  createAuthProbeApp,
  createUploadApp,
  routeInventory,
  urlForRoute,
};
