// @ts-nocheck
// src/api/provider.js
//
// Public provider feeds for tuner/guide consumers such as Plex. These routes
// intentionally live outside `/api/*` so the API key auth baseline remains
// intact while external clients can fetch plain XMLTV/M3U.
//
// — Codex (OpenAI), Lane Alpha · 2026-05-06

'use strict';

const fs = require('fs');
const express = require('express');

const { apiError, NOT_FOUND } = require('../lib/errors');
const { getProviderBaseUrl, replaceLoopbackBaseUrls } = require('../lib/url');
const { asyncRoute, resolveXmltvPath } = require('./_helpers');

function createRouter(deps) {
  const { m3uService } = deps;
  const router = express.Router();

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

      const host = getProviderBaseUrl(req);
      const fileFinal = replaceLoopbackBaseUrls(
        fileContent.replace(/\{\{host\}\}/g, host),
        host
      );
      res.set('Cache-Control', 'no-store');
      res.type('application/xml');
      res.send(fileFinal);
    })
  );

  router.get(
    '/channels.m3u',
    asyncRoute(async (req, res) => {
      if (!m3uService) {
        return apiError(res, 'INTERNAL', 'm3u service unavailable');
      }

      const host = getProviderBaseUrl(req);
      const data = await m3uService.getChannelList(host);
      res.type('text');
      res.send(data);
    })
  );

  return router;
}

module.exports = {
  createRouter,
};
