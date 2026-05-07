// tests/helpers/api-router.js
// Test harness for the Phase 4 per-resource API. Builds an Express app with
// the new `src/api/index.js` composition root mounted; mocks the dep bag.
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const express = require('express');
const fileUpload = require('express-fileupload');

const apiCompose = require('../../src/api');

function collection(rows = []) {
  return {
    find: () => rows,
    update: () => {},
    save: () => {},
    remove: () => {},
    load: () => {},
  };
}

function createMockDependencies(overrides = {}) {
  const defaultDb = new Proxy(
    {},
    {
      get: () => collection([{ _id: 'fixture', ffmpegPath: 'ffmpeg' }]),
    }
  );

  const channels = new Map([
    [
      1,
      {
        number: 1,
        name: 'Existing Channel',
        programs: [],
        fallback: [],
      },
    ],
  ]);

  const channelService = {
    getChannel: async (number) => channels.get(number) || null,
    getAllChannels: async () => Array.from(channels.values()),
    getAllChannelNumbers: async () =>
      Array.from(channels.keys()).map((n) => ({ number: n })),
    saveChannel: async (number, channel) => {
      channels.set(Number(number), channel);
    },
    deleteChannel: async (number) => {
      channels.delete(Number(number));
    },
  };

  const fillerDB = {
    getAllFillersInfo: async () => [],
    getFiller: async () => ({ id: 'fixture' }),
    saveFiller: async () => {},
    createFiller: async () => 'fixture',
    deleteFiller: async () => {},
    getFillerChannels: async () => [],
  };

  const customShowDB = {
    getAllShowsInfo: async () => [],
    getShow: async () => ({ id: 'fixture' }),
    saveShow: async () => {},
    createShow: async () => 'fixture',
    deleteShow: async () => {},
  };

  return {
    db: defaultDb,
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
      getCurrentState: () => ({ ffmpegPath: 'ffmpeg' }),
    },
    ...overrides,
  };
}

function createApiRouter(overrides = {}) {
  const deps = createMockDependencies(overrides);
  return apiCompose.compose(deps);
}

function createApiApp(overrides = {}) {
  const app = express();
  app.use(express.json());
  app.use(createApiRouter(overrides));
  return app;
}

function createUploadApp(fileUploadOptions = {}) {
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
      ...fileUploadOptions,
    })
  );
  app.use(createApiRouter());
  return app;
}

// Walk the composed router and surface every leaf route as
// {method, path}. Used by the auth-baseline test to probe every endpoint.
function routeInventory(router) {
  const inventory = [];
  function walk(stack, prefix) {
    for (const layer of stack) {
      if (layer.route && layer.route.path) {
        // The new router mounts each per-resource sub-router under a path
        // prefix; layer.route.path is the relative path inside that
        // sub-router.
        const fullPath = prefix + layer.route.path;
        for (const method of Object.keys(layer.route.methods)) {
          inventory.push({ method, path: fullPath, layer });
        }
      } else if (
        layer.name === 'router' &&
        layer.handle &&
        layer.handle.stack
      ) {
        const subPrefix =
          prefix +
          (layer.regexp && layer.regexp.fast_slash
            ? ''
            : ((layer.regexp &&
                layer.regexp.toString().match(/\^\\(\/[^\\?]+)/)) || [
                '',
                '',
              ])[1].replace(/\\/g, ''));
        walk(layer.handle.stack, subPrefix);
      }
    }
  }
  walk(router.stack, '');
  return inventory.filter((r) => r.path.startsWith('/api/'));
}

function urlForRoute(routePath) {
  return routePath
    .replace(/:number/g, '1')
    .replace(/:id/g, 'fixture')
    .replace(/:name/g, 'fixture');
}

function createAuthProbeApp() {
  const router = createApiRouter();
  const routes = routeInventory(router);
  // Replace each leaf handler with a 204 stub so the probe app doesn't depend
  // on the real services succeeding — we're only interested in whether the
  // auth gate fires before the handler does.
  for (const route of routes) {
    const handlers = route.layer.route.stack;
    const lastHandler = handlers[handlers.length - 1];
    lastHandler.handle = (req, res) => {
      res.status(204).send();
    };
  }

  const app = express();
  app.use(express.json());
  app.use(router);

  return { app, routes };
}

module.exports = {
  apiCompose,
  collection,
  createApiApp,
  createApiRouter,
  createAuthProbeApp,
  createMockDependencies,
  createUploadApp,
  routeInventory,
  urlForRoute,
};
