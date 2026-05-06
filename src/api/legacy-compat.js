// src/api/legacy-compat.js
//
// Temporary compatibility shims for the legacy AngularJS UI. Phase 4 moved the
// public API to REST-uniform resource routers, but the current operator UI still
// calls the old dizqueTV paths. Keep these aliases thin and remove them once
// Lane Beta's React client fully replaces the Angular service.
//
// These routes are auth-gated by the composition root and intentionally omitted
// from docs/openapi.yaml so new clients do not depend on them.
//
// - Codex (OpenAI), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');
const fs = require('fs');
const JSONStream = require('JSONStream');

const Plex = require('../plex.js');
const PlexServerDB = require('../dao/plex-server-db');
const throttle = require('../services/throttle');
const timeSlotsService = require('../services/time-slots-service');
const randomSlotsService = require('../services/random-slots-service');
const { getInternalBaseUrl } = require('../lib/url');
const uploadModule = require('./upload');
const { apiError, VALIDATION_ERROR, NOT_FOUND } = require('../lib/errors');
const {
  asyncRoute,
  parsePositiveInt,
  requireBodyString,
  missingPathParam,
  safeString,
  resolveXmltvPath,
} = require('./_helpers');

const PROBE_TIMEOUT_MS = 60000;

const PLEX_DEFAULTS = Object.freeze({
  streamPath: 'plex',
  debugLogging: true,
  directStreamBitrate: '20000',
  transcodeBitrate: '2000',
  mediaBufferSize: 1000,
  transcodeMediaBufferSize: 20000,
  maxPlayableResolution: '1920x1080',
  maxTranscodeResolution: '1920x1080',
  videoCodecs: 'h264,hevc,mpeg2video,av1',
  audioCodecs: 'ac3',
  maxAudioChannels: '2',
  audioBoost: '100',
  enableSubtitles: false,
  subtitleSize: '100',
  updatePlayStatus: false,
  streamProtocol: 'http',
  forceDirectPlay: false,
  pathReplace: '',
  pathReplaceWith: '',
});

const HDHR_DEFAULTS = Object.freeze({
  tunerCount: 1,
  autoDiscovery: true,
});

const XMLTV_DEFAULTS = Object.freeze({
  cache: 12,
  refresh: 4,
  enableImageCache: false,
});

function settingsKey(section) {
  return `${section}-settings`;
}

function pushEvent(eventService, eventName, payload) {
  if (eventService && typeof eventService.push === 'function') {
    eventService.push(eventName, payload);
  }
}

function collectionOne(db, key) {
  const rows = db[key].find();
  return rows && rows[0] ? rows[0] : {};
}

function recordId(record) {
  return record && record._id ? record._id : 'fixture';
}

function legacyXmltv(record, req) {
  const host = req ? getInternalBaseUrl(req) : getInternalBaseUrl();
  return {
    ...(record || {}),
    file: resolveXmltvPath(),
    xmltvUrl: `${host}/xmltv.xml`,
    m3uUrl: `${host}/channels.m3u`,
  };
}

function normalizeChannelNumbers(channels) {
  return channels
    .map((channel) => {
      if (channel && typeof channel === 'object') {
        return parseInt(channel.number, 10);
      }
      return parseInt(channel, 10);
    })
    .filter((number) => Number.isInteger(number))
    .sort((a, b) => a - b);
}

async function sendPrograms(channel, res) {
  const programs = channel.programs;
  if (typeof programs === 'undefined') {
    return apiError(res, NOT_FOUND, 'Channel has no programs');
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  const transformStream = JSONStream.stringify();
  transformStream.pipe(res);
  for (let i = 0; i < programs.length; i += 1) {
    transformStream.write(programs[i]);

    await throttle();
  }
  return transformStream.end();
}

async function streamToolResult(toolRes, res) {
  const programs = toolRes.programs;
  delete toolRes.programs;
  let s = JSON.stringify(toolRes);
  s = s.slice(0, -1);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  const transformStream = JSONStream.stringify(`${s},"programs":[`, ',', ']}');
  transformStream.pipe(res);
  for (let i = 0; i < programs.length; i += 1) {
    transformStream.write(programs[i]);

    await throttle();
  }
  transformStream.end();
}

async function probeServer(server) {
  const plex = new Plex(server);
  return Promise.race([
    plex.checkServerStatus(),
    new Promise((resolve) => {
      setTimeout(() => resolve(-1), PROBE_TIMEOUT_MS);
    }),
  ]);
}

function createPlexServerDB(deps) {
  return new PlexServerDB(
    deps.channelService,
    deps.fillerDB,
    deps.customShowDB,
    deps.db
  );
}

function plexServerExists(db, name) {
  return db['plex-servers'].find({ name }).length > 0;
}

async function updatePlexServer(deps, server) {
  const plexServerDB = createPlexServerDB(deps);
  const report = await plexServerDB.updateServer(server);
  let modifiedPrograms = 0;
  let destroyedPrograms = 0;
  report.forEach((r) => {
    modifiedPrograms += r.modifiedPrograms;
    destroyedPrograms += r.destroyedPrograms;
  });
  return { report, modifiedPrograms, destroyedPrograms };
}

function createSettingsRoutes(router, deps) {
  const { db, ffmpegSettingsService, eventService, xmltvInterval } = deps;

  router.get(
    '/ffmpeg-settings',
    asyncRoute(async (_req, res) => {
      res.send(ffmpegSettingsService.get());
    })
  );

  router.put(
    '/ffmpeg-settings',
    asyncRoute(async (req, res) => {
      const result = ffmpegSettingsService.update(req.body);
      if (typeof result.error !== 'undefined') {
        return apiError(res, VALIDATION_ERROR, result.error);
      }
      pushEvent(eventService, 'settings-update', {
        message: 'FFMPEG configuration updated.',
        module: 'ffmpeg',
        detail: { action: 'update' },
        level: 'info',
      });
      res.send(result.ffmpeg);
    })
  );

  router.post(
    '/ffmpeg-settings',
    asyncRoute(async (_req, res) => {
      const ffmpeg = ffmpegSettingsService.reset();
      pushEvent(eventService, 'settings-update', {
        message: 'FFMPEG configuration reset.',
        module: 'ffmpeg',
        detail: { action: 'reset' },
        level: 'warning',
      });
      res.send(ffmpeg);
    })
  );

  for (const section of ['plex', 'hdhr']) {
    router.get(
      `/${section}-settings`,
      asyncRoute(async (_req, res) => {
        res.send(collectionOne(db, settingsKey(section)));
      })
    );

    router.put(
      `/${section}-settings`,
      asyncRoute(async (req, res) => {
        const body = req.body || {};
        const existing = collectionOne(db, settingsKey(section));
        db[settingsKey(section)].update(
          { _id: body._id || recordId(existing) },
          { ...body, _id: body._id || recordId(existing) }
        );
        pushEvent(eventService, 'settings-update', {
          message: `${section} settings updated.`,
          module: section,
          detail: { action: 'update' },
          level: 'info',
        });
        res.send(collectionOne(db, settingsKey(section)));
      })
    );

    router.post(
      `/${section}-settings`,
      asyncRoute(async (req, res) => {
        const body = req.body || {};
        const existing = collectionOne(db, settingsKey(section));
        const defaults = section === 'plex' ? PLEX_DEFAULTS : HDHR_DEFAULTS;
        db[settingsKey(section)].update(
          { _id: body._id || recordId(existing) },
          { _id: body._id || recordId(existing), ...defaults }
        );
        pushEvent(eventService, 'settings-update', {
          message: `${section} settings reset.`,
          module: section,
          detail: { action: 'reset' },
          level: 'warning',
        });
        res.send(collectionOne(db, settingsKey(section)));
      })
    );
  }

  router.get(
    '/xmltv-settings',
    asyncRoute(async (req, res) => {
      res.send(legacyXmltv(collectionOne(db, 'xmltv-settings'), req));
    })
  );

  router.put(
    '/xmltv-settings',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      const existing = collectionOne(db, 'xmltv-settings');
      db['xmltv-settings'].update(
        { _id: body._id || recordId(existing) },
        {
          _id: body._id || recordId(existing),
          cache: body.cache,
          refresh: body.refresh,
          enableImageCache: body.enableImageCache === true,
        }
      );
      pushEvent(eventService, 'settings-update', {
        message: 'xmltv settings updated.',
        module: 'xmltv',
        detail: { action: 'update' },
        level: 'info',
      });
      if (xmltvInterval && typeof xmltvInterval.updateXML === 'function') {
        xmltvInterval.updateXML();
        if (typeof xmltvInterval.restartInterval === 'function') {
          xmltvInterval.restartInterval();
        }
      }
      res.send(legacyXmltv(collectionOne(db, 'xmltv-settings'), req));
    })
  );

  router.post(
    '/xmltv-settings',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      const existing = collectionOne(db, 'xmltv-settings');
      db['xmltv-settings'].update(
        { _id: body._id || recordId(existing) },
        { _id: body._id || recordId(existing), ...XMLTV_DEFAULTS }
      );
      pushEvent(eventService, 'settings-update', {
        message: 'xmltv settings reset.',
        module: 'xmltv',
        detail: { action: 'reset' },
        level: 'warning',
      });
      if (xmltvInterval && typeof xmltvInterval.updateXML === 'function') {
        xmltvInterval.updateXML();
      }
      res.send(legacyXmltv(collectionOne(db, 'xmltv-settings'), req));
    })
  );
}

function createRouter(deps) {
  const {
    db,
    channelService,
    fillerDB,
    customShowDB,
    eventService,
    m3uService,
  } = deps;
  if (!db) throw new Error('createRouter(legacy-compat): db is required');
  if (!channelService) {
    throw new Error('createRouter(legacy-compat): channelService is required');
  }
  const router = express.Router();

  router.get(
    '/channelNumbers',
    asyncRoute(async (_req, res) => {
      const channels = await channelService.getAllChannelNumbers();
      res.send(normalizeChannelNumbers(channels));
    })
  );

  router.get(
    '/channel/description/:number',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');
      const channel = await channelService.getChannel(number);
      if (channel == null) {
        return apiError(res, NOT_FOUND, 'Channel not found', { number });
      }
      res.send({
        number: channel.number,
        icon: channel.icon,
        name: channel.name,
        stealth: channel.stealth,
      });
    })
  );

  router.get(
    '/channel/programless/:number',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');
      const channel = await channelService.getChannel(number);
      if (channel == null) {
        return apiError(res, NOT_FOUND, 'Channel not found', { number });
      }
      const copy = {};
      Object.keys(channel).forEach((key) => {
        if (key !== 'programs') copy[key] = channel[key];
      });
      res.send(copy);
    })
  );

  router.get(
    '/channel/programs/:number',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');
      const channel = await channelService.getChannel(number);
      if (channel == null) {
        return apiError(res, NOT_FOUND, 'Channel not found', { number });
      }
      await sendPrograms(channel, res);
    })
  );

  router.get(
    '/channel/:number',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');
      const channel = await channelService.getChannel(number);
      if (channel == null) {
        return apiError(res, NOT_FOUND, 'Channel not found', { number });
      }
      res.send(channel);
    })
  );

  router.post(
    '/channel',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      const number = parsePositiveInt(body.number);
      if (number == null) {
        return apiError(res, VALIDATION_ERROR, 'channel.number is required', {
          field: 'number',
        });
      }
      await channelService.saveChannel(number, body);
      res.status(201).send({ number });
    })
  );

  router.put(
    '/channel',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      const number = parsePositiveInt(body.number);
      if (number == null) {
        return apiError(res, VALIDATION_ERROR, 'channel.number is required', {
          field: 'number',
        });
      }
      await channelService.saveChannel(number, { ...body, number });
      res.send({ number });
    })
  );

  router.delete(
    '/channel',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.body && req.body.number);
      if (number == null) {
        return apiError(res, VALIDATION_ERROR, 'channel.number is required', {
          field: 'number',
        });
      }
      await channelService.deleteChannel(number);
      res.send({ number });
    })
  );

  router.use('/upload', uploadModule.createRouter(deps));

  router.get(
    '/xmltv.xml',
    asyncRoute(async (req, res) => {
      const xmltvPath = resolveXmltvPath();
      let fileContent;
      try {
        fileContent = fs.readFileSync(xmltvPath, 'utf8');
      } catch (err) {
        if (err && err.code === 'ENOENT') {
          return apiError(
            res,
            NOT_FOUND,
            'xmltv.xml has not been generated yet'
          );
        }
        throw err;
      }
      const host = `${req.protocol}://${req.get('host')}`;
      res.set('Cache-Control', 'no-store');
      res.type('application/xml');
      res.send(fileContent.replace(/\{\{host\}\}/g, host));
    })
  );

  router.get(
    '/channels.m3u',
    asyncRoute(async (req, res) => {
      if (!m3uService) {
        return apiError(res, 'INTERNAL', 'm3u service unavailable');
      }
      res.type('text');
      const host = getInternalBaseUrl(req);
      const data = await m3uService.getChannelList(host);
      res.send(data);
    })
  );

  router.post(
    '/plex-servers/foreignstatus',
    asyncRoute(async (req, res) => {
      const server = req.body;
      if (!server || typeof server !== 'object') {
        return apiError(
          res,
          VALIDATION_ERROR,
          'Body must be a Plex server object'
        );
      }
      const status = await probeServer(server);
      res.send({ status });
    })
  );

  router.post(
    '/plex-servers',
    asyncRoute(async (req, res, next) => {
      const name = requireBodyString(req.body, 'name');
      if (!name || !plexServerExists(db, name)) {
        return next();
      }
      try {
        const { modifiedPrograms, destroyedPrograms } = await updatePlexServer(
          deps,
          req.body
        );
        pushEvent(eventService, 'settings-update', {
          message: `Plex server ${name} updated. ${modifiedPrograms} programs modified, ${destroyedPrograms} programs deleted`,
          module: 'plex-server',
          detail: { serverName: name, action: 'update' },
          level: 'warning',
        });
        res.status(204).send();
      } catch (err) {
        console.error('Could not update plex server.', err);
        pushEvent(eventService, 'settings-update', {
          message: 'Error updating plex server.',
          module: 'plex-server',
          detail: {
            action: 'update',
            serverName: safeString(req, 'body', 'name'),
            error: safeString(err, 'message'),
          },
          level: 'danger',
        });
        return apiError(res, VALIDATION_ERROR, 'Could not update plex server', {
          reason: safeString(err, 'message'),
        });
      }
    })
  );

  router.put(
    '/plex-servers',
    asyncRoute(async (req, res) => {
      try {
        const plexServerDB = createPlexServerDB(deps);
        await plexServerDB.addServer(req.body);
        pushEvent(eventService, 'settings-update', {
          message: `Plex server ${req.body && req.body.name} added.`,
          module: 'plex-server',
          detail: { serverName: req.body && req.body.name, action: 'add' },
          level: 'info',
        });
        res
          .status(201)
          .send({ created: true, name: req.body && req.body.name });
      } catch (err) {
        console.error('Could not add plex server.', err);
        pushEvent(eventService, 'settings-update', {
          message: 'Error adding plex server.',
          module: 'plex-server',
          detail: {
            action: 'add',
            serverName: safeString(req, 'body', 'name'),
            error: safeString(err, 'message'),
          },
          level: 'danger',
        });
        return apiError(res, VALIDATION_ERROR, 'Could not add plex server', {
          reason: safeString(err, 'message'),
        });
      }
    })
  );

  router.delete(
    '/plex-servers',
    asyncRoute(async (req, res) => {
      const name = requireBodyString(req.body, 'name');
      if (!name) {
        return apiError(res, VALIDATION_ERROR, 'Missing Plex server name', {
          field: 'name',
        });
      }
      try {
        const plexServerDB = createPlexServerDB(deps);
        const report = await plexServerDB.deleteServer(name);
        pushEvent(eventService, 'settings-update', {
          message: `Plex server ${name} removed.`,
          module: 'plex-server',
          detail: { serverName: name, action: 'delete' },
          level: 'warn',
        });
        res.send(report);
      } catch (err) {
        console.error(err);
        pushEvent(eventService, 'settings-update', {
          message: 'Error deleting plex server.',
          module: 'plex-server',
          detail: {
            action: 'delete',
            serverName: name,
            error: safeString(err, 'message'),
          },
          level: 'danger',
        });
        return apiError(res, VALIDATION_ERROR, 'Could not delete plex server', {
          reason: safeString(err, 'message'),
        });
      }
    })
  );

  if (fillerDB) {
    router.get(
      '/fillers',
      asyncRoute(async (_req, res) => {
        res.send(await fillerDB.getAllFillersInfo());
      })
    );

    router.get(
      '/filler/:id/channels',
      asyncRoute(async (req, res) => {
        const channels = await fillerDB.getFillerChannels(req.params.id);
        if (channels == null) {
          return apiError(res, NOT_FOUND, 'Filler list not found', {
            id: req.params.id,
          });
        }
        res.send(channels);
      })
    );

    router.get(
      '/filler/:id',
      asyncRoute(async (req, res) => {
        const filler = await fillerDB.getFiller(req.params.id);
        if (filler == null) {
          return apiError(res, NOT_FOUND, 'Filler list not found', {
            id: req.params.id,
          });
        }
        res.send(filler);
      })
    );

    router.post(
      '/filler/:id',
      asyncRoute(async (req, res) => {
        await fillerDB.saveFiller(req.params.id, req.body);
        res.status(204).send();
      })
    );

    router.put(
      '/filler',
      asyncRoute(async (req, res) => {
        const id = await fillerDB.createFiller(req.body);
        res.status(201).send({ id });
      })
    );

    router.delete(
      '/filler/:id',
      asyncRoute(async (req, res) => {
        await fillerDB.deleteFiller(req.params.id);
        res.status(204).send();
      })
    );
  }

  if (customShowDB) {
    router.get(
      '/shows',
      asyncRoute(async (_req, res) => {
        res.send(await customShowDB.getAllShowsInfo());
      })
    );

    router.get(
      '/show/:id',
      asyncRoute(async (req, res) => {
        const show = await customShowDB.getShow(req.params.id);
        if (show == null) {
          return apiError(res, NOT_FOUND, 'Custom show not found', {
            id: req.params.id,
          });
        }
        res.send(show);
      })
    );

    router.post(
      '/show/:id',
      asyncRoute(async (req, res) => {
        await customShowDB.saveShow(req.params.id, req.body);
        res.status(204).send();
      })
    );

    router.put(
      '/show',
      asyncRoute(async (req, res) => {
        const id = await customShowDB.createShow(req.body);
        res.status(201).send({ id });
      })
    );

    router.delete(
      '/show/:id',
      asyncRoute(async (req, res) => {
        await customShowDB.deleteShow(req.params.id);
        res.status(204).send();
      })
    );
  }

  router.post(
    '/channel-tools/time-slots',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      const toolRes = await timeSlotsService(body.programs, body.schedule);
      if (typeof toolRes.userError !== 'undefined') {
        return apiError(res, VALIDATION_ERROR, toolRes.userError);
      }
      await streamToolResult(toolRes, res);
    })
  );

  router.post(
    '/channel-tools/random-slots',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      const toolRes = await randomSlotsService(body.programs, body.schedule);
      if (typeof toolRes.userError !== 'undefined') {
        return apiError(res, VALIDATION_ERROR, toolRes.userError);
      }
      await streamToolResult(toolRes, res);
    })
  );

  createSettingsRoutes(router, deps);

  return router;
}

module.exports = { createRouter };
