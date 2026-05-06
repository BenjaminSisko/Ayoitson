// @ts-nocheck
// src/api/guide.js
//
// TV guide / XMLTV / M3U routes. Mounted under `/api/guide`.
//
// xmltv path is HARD-CODED to `${DATABASE}/xmltv.xml` (resolveXmltvPath).
// Closing F10-xmltv-readfile — the operator-controllable
// xmltvSettings.file field is dropped from settings entirely.
//
//   GET  /status                          guide status
//   GET  /debug                           full guide dump
//   GET  /last-refresh                    epoch ms of last xmltv update
//   GET  /channels/:number                lineup for one channel
//   GET  /xmltv.xml                       serve the xmltv file
//   GET  /channels.m3u                    serve the m3u
//   POST /time-slots                      time-slot tool
//   POST /random-slots                    random-slot tool
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');
const fs = require('fs');
const JSONStream = require('JSONStream');

const timeSlotsService = require('../services/time-slots-service');
const randomSlotsService = require('../services/random-slots-service');
const throttle = require('../services/throttle');
const { getInternalBaseUrl } = require('../lib/url');
const { apiError, VALIDATION_ERROR, NOT_FOUND } = require('../lib/errors');
const {
  asyncRoute,
  parsePositiveInt,
  missingPathParam,
  resolveXmltvPath,
} = require('./_helpers');

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

function createRouter(deps) {
  const { guideService, xmltvInterval, m3uService } = deps;
  if (!guideService) {
    throw new Error('createRouter(guide): guideService is required');
  }
  const router = express.Router();

  router.get(
    '/status',
    asyncRoute(async (req, res) => {
      res.send(await guideService.getStatus());
    })
  );

  router.get(
    '/debug',
    asyncRoute(async (req, res) => {
      res.send(await guideService.get());
    })
  );

  router.get(
    '/last-refresh',
    asyncRoute(async (req, res) => {
      const lastUpdated =
        xmltvInterval && xmltvInterval.lastUpdated
          ? xmltvInterval.lastUpdated.valueOf()
          : 0;
      res.send({ value: lastUpdated });
    })
  );

  router.get(
    '/channels/:number',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');
      const dateFrom = new Date(req.query.dateFrom);
      const dateTo = new Date(req.query.dateTo);
      const lineup = await guideService.getChannelLineup(
        number,
        dateFrom,
        dateTo
      );
      if (lineup == null) {
        return apiError(res, NOT_FOUND, 'Channel not found in TV guide', {
          number,
        });
      }
      res.send(lineup);
    })
  );

  router.get(
    '/xmltv.xml',
    asyncRoute(async (req, res) => {
      // Path is hard-coded — no operator-controllable input. Closes
      // F10-xmltv-readfile (CWE-22 / arbitrary-file-read).
      const xmltvPath = resolveXmltvPath();
      const host = `${req.protocol}://${req.get('host')}`;
      let fileContent;
      try {
        fileContent = fs.readFileSync(xmltvPath, 'utf8');
      } catch (err) {
        if (err && err.code === 'ENOENT') {
          // Important: do NOT pre-set Content-Type to xml here, the error
          // envelope is JSON.
          return apiError(
            res,
            NOT_FOUND,
            'xmltv.xml has not been generated yet'
          );
        }
        throw err;
      }
      res.set('Cache-Control', 'no-store');
      res.type('application/xml');
      const fileFinal = fileContent.replace(/\{\{host\}\}/g, host);
      res.send(fileFinal);
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
    '/time-slots',
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
    '/random-slots',
    asyncRoute(async (req, res) => {
      const body = req.body || {};
      const toolRes = await randomSlotsService(body.programs, body.schedule);
      if (typeof toolRes.userError !== 'undefined') {
        return apiError(res, VALIDATION_ERROR, toolRes.userError);
      }
      await streamToolResult(toolRes, res);
    })
  );

  return router;
}

module.exports = { createRouter };
