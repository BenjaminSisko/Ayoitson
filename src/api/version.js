// src/api/version.js
//
// Returns Ayoitson, ffmpeg, and node versions. Auth-required by default per
// the prompt's constraint — discloses the installed dependency surface.
// Mounted under /api/version (treated as a singleton resource for routing
// hygiene; no body, no params).
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');

const FFMPEGInfo = require('../ffmpeg-info');
const constants = require('../constants');
const {
  apiError,
  UPSTREAM_ERROR,
} = require('../lib/errors');
const { asyncRoute } = require('./_helpers');

function createRouter(deps) {
  const { db } = deps;
  if (!db) throw new Error('createRouter(version): db is required');
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      try {
        const ffmpegSettings = db['ffmpeg-settings'].find()[0];
        const v = await new FFMPEGInfo(ffmpegSettings).getVersion();
        res.send({
          name: constants.APP_NAME,
          version: constants.VERSION_NAME,
          ffmpeg: v,
          nodejs: process.version,
        });
      } catch (err) {
        console.error('Could not query ffmpeg version', err);
        return apiError(res, UPSTREAM_ERROR, 'Could not query ffmpeg version');
      }
    })
  );

  return router;
}

module.exports = { createRouter };
