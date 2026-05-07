// @ts-nocheck
// src/api/settings.js
//
// Settings (singleton) resource. Mounted under `/api/settings`. Each named
// section (ffmpeg, plex, xmltv, hdhr) has GET, PUT, and a dedicated
// POST /:name/reset path — replaces the legacy "POST overloads as reset" shape.
//
// xmltv-settings drops the operator-controllable `file` field on the way in
// and out: closing F10-xmltv-readfile. The runtime xmltv path is now hard-
// coded in src/api/guide.js and src/api/_helpers.js (resolveXmltvPath).
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');

const { writeRequestAudit } = require('../lib/audit');
const { listWellKnownFFmpegPaths } = require('../lib/ffmpeg-path-validator');
const { apiError, VALIDATION_ERROR } = require('../lib/errors');
const { asyncRoute, safeString } = require('./_helpers');

const ALLOWED_SECTIONS = new Set(['ffmpeg', 'plex', 'xmltv', 'hdhr']);

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
});

function stripXmltvFile(record) {
  if (!record || typeof record !== 'object') return record;
  const copy = { ...record };
  // The hard-coded path lives in resolveXmltvPath(); we never round-trip the
  // operator-controllable `file` field through the API.
  delete copy.file;
  return copy;
}

function settingsKey(section) {
  return `${section}-settings`;
}

function createRouter(deps) {
  const {
    db,
    ffmpegSettingsService,
    eventService,
    xmltvInterval,
    auditLogger,
  } = deps;
  if (!db) throw new Error('createRouter(settings): db is required');
  if (!ffmpegSettingsService) {
    throw new Error(
      'createRouter(settings): ffmpegSettingsService is required'
    );
  }
  const router = express.Router();

  function getFfmpegState() {
    if (typeof ffmpegSettingsService.getCurrentState === 'function') {
      return ffmpegSettingsService.getCurrentState();
    }
    return null;
  }

  // --- ffmpeg ---

  router.get(
    '/ffmpeg',
    asyncRoute(async (req, res) => {
      res.send(ffmpegSettingsService.get());
    })
  );

  router.get(
    '/ffmpeg/known-paths',
    asyncRoute(async (_req, res) => {
      res.send({ paths: listWellKnownFFmpegPaths() });
    })
  );

  router.put(
    '/ffmpeg',
    asyncRoute(async (req, res) => {
      const before = getFfmpegState();
      const result = ffmpegSettingsService.update(req.body);
      if (typeof result.error !== 'undefined') {
        return apiError(res, VALIDATION_ERROR, result.error);
      }
      const after = getFfmpegState();
      writeRequestAudit(auditLogger, req, 'settings.changed', {
        section: 'ffmpeg',
        action: 'update',
      });
      if (before && after && before.ffmpegPath !== after.ffmpegPath) {
        writeRequestAudit(auditLogger, req, 'ffmpeg.path.changed', {
          oldPath: before.ffmpegPath,
          newPath: after.ffmpegPath,
        });
      }
      eventService.push('settings-update', {
        message: 'FFMPEG configuration updated.',
        module: 'ffmpeg',
        detail: { action: 'update' },
        level: 'info',
      });
      res.send(result.ffmpeg);
    })
  );

  router.post(
    '/ffmpeg/reset',
    asyncRoute(async (req, res) => {
      try {
        const before = getFfmpegState();
        const ffmpeg = ffmpegSettingsService.reset();
        const after = getFfmpegState();
        writeRequestAudit(auditLogger, req, 'settings.changed', {
          section: 'ffmpeg',
          action: 'reset',
        });
        if (before && after && before.ffmpegPath !== after.ffmpegPath) {
          writeRequestAudit(auditLogger, req, 'ffmpeg.path.changed', {
            oldPath: before.ffmpegPath,
            newPath: after.ffmpegPath,
          });
        }
        eventService.push('settings-update', {
          message: 'FFMPEG configuration reset.',
          module: 'ffmpeg',
          detail: { action: 'reset' },
          level: 'warning',
        });
        res.send(ffmpeg);
      } catch (err) {
        eventService.push('settings-update', {
          message: 'Error reseting FFMPEG configuration.',
          module: 'ffmpeg',
          detail: { action: 'reset', error: safeString(err, 'message') },
          level: 'danger',
        });
        throw err;
      }
    })
  );

  // --- plex ---

  router.get(
    '/plex',
    asyncRoute(async (req, res) => {
      const plex = db['plex-settings'].find()[0];
      res.send(plex);
    })
  );

  router.put(
    '/plex',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      db['plex-settings'].update({ _id: body._id }, body);
      writeRequestAudit(auditLogger, req, 'settings.changed', {
        section: 'plex',
        action: 'update',
      });
      eventService.push('settings-update', {
        message: 'Plex configuration updated.',
        module: 'plex',
        detail: { action: 'update' },
        level: 'info',
      });
      const plex = db['plex-settings'].find()[0];
      res.send(plex);
    })
  );

  router.post(
    '/plex/reset',
    asyncRoute(async (req, res) => {
      const existing = db['plex-settings'].find()[0] || {};
      db['plex-settings'].update(
        { _id: existing._id },
        { ...PLEX_DEFAULTS, _id: existing._id }
      );
      writeRequestAudit(auditLogger, req, 'settings.changed', {
        section: 'plex',
        action: 'reset',
      });
      eventService.push('settings-update', {
        message: 'Plex configuration reset.',
        module: 'plex',
        detail: { action: 'reset' },
        level: 'warning',
      });
      const plex = db['plex-settings'].find()[0];
      res.send(plex);
    })
  );

  // --- xmltv ---

  router.get(
    '/xmltv',
    asyncRoute(async (req, res) => {
      const xmltv = db['xmltv-settings'].find()[0];
      res.send(stripXmltvFile(xmltv));
    })
  );

  router.put(
    '/xmltv',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      // Reject any attempt to set `file`; the hard-coded path is the only
      // legal value. Closing F10-xmltv-readfile.
      if (typeof body.file !== 'undefined') {
        return apiError(
          res,
          VALIDATION_ERROR,
          'xmltv.file is not operator-controllable; the path is hard-coded',
          { field: 'file' }
        );
      }
      db['xmltv-settings'].update(
        { _id: body._id },
        {
          _id: body._id,
          cache: body.cache,
          refresh: body.refresh,
          enableImageCache: body.enableImageCache === true,
        }
      );
      writeRequestAudit(auditLogger, req, 'settings.changed', {
        section: 'xmltv',
        action: 'update',
      });
      eventService.push('settings-update', {
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
      const xmltv = db['xmltv-settings'].find()[0];
      res.send(stripXmltvFile(xmltv));
    })
  );

  router.post(
    '/xmltv/reset',
    asyncRoute(async (req, res) => {
      const existing = db['xmltv-settings'].find()[0] || {};
      db['xmltv-settings'].update(
        { _id: existing._id },
        { _id: existing._id, ...XMLTV_DEFAULTS }
      );
      writeRequestAudit(auditLogger, req, 'settings.changed', {
        section: 'xmltv',
        action: 'reset',
      });
      eventService.push('settings-update', {
        message: 'xmltv settings reset.',
        module: 'xmltv',
        detail: { action: 'reset' },
        level: 'warning',
      });
      if (xmltvInterval && typeof xmltvInterval.updateXML === 'function') {
        xmltvInterval.updateXML();
      }
      const xmltv = db['xmltv-settings'].find()[0];
      res.send(stripXmltvFile(xmltv));
    })
  );

  // --- hdhr ---

  router.get(
    '/hdhr',
    asyncRoute(async (req, res) => {
      const hdhr = db['hdhr-settings'].find()[0];
      res.send(hdhr);
    })
  );

  router.put(
    '/hdhr',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      db['hdhr-settings'].update({ _id: body._id }, body);
      writeRequestAudit(auditLogger, req, 'settings.changed', {
        section: 'hdhr',
        action: 'update',
      });
      eventService.push('settings-update', {
        message: 'HDHR configuration updated.',
        module: 'hdhr',
        detail: { action: 'update' },
        level: 'info',
      });
      const hdhr = db['hdhr-settings'].find()[0];
      res.send(hdhr);
    })
  );

  router.post(
    '/hdhr/reset',
    asyncRoute(async (req, res) => {
      const existing = db['hdhr-settings'].find()[0] || {};
      db['hdhr-settings'].update(
        { _id: existing._id },
        { _id: existing._id, ...HDHR_DEFAULTS }
      );
      writeRequestAudit(auditLogger, req, 'settings.changed', {
        section: 'hdhr',
        action: 'reset',
      });
      eventService.push('settings-update', {
        message: 'HDHR configuration reset.',
        module: 'hdhr',
        detail: { action: 'reset' },
        level: 'warning',
      });
      const hdhr = db['hdhr-settings'].find()[0];
      res.send(hdhr);
    })
  );

  // --- generic guard for unknown settings sections ---
  router.use((req, res) => {
    const section = (req.path || '').split('/')[1];
    if (!ALLOWED_SECTIONS.has(section)) {
      return apiError(res, VALIDATION_ERROR, 'Unknown settings section', {
        section,
      });
    }
    return apiError(res, VALIDATION_ERROR, 'Unsupported method on settings', {
      section,
    });
  });

  return router;
}

module.exports = { createRouter, ALLOWED_SECTIONS };
