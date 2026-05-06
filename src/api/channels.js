// src/api/channels.js
//
// Channels resource — REST-uniform routes mounted under `/api/channels`.
//
//   GET    /                       list channel summaries
//   GET    /numbers                list channel numbers (legacy compat)
//   GET    /:number                read channel; ?programless=true strips programs
//   GET    /:number/programs       stream programs JSON
//   GET    /:number/description    minimal channel descriptor
//   POST   /                       create channel (body has number)
//   PUT    /:number                update channel
//   DELETE /:number                delete channel
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');
const JSONStream = require('JSONStream');

const throttle = require('../services/throttle');
const {
  apiError,
  VALIDATION_ERROR,
  NOT_FOUND,
} = require('../lib/errors');
const {
  asyncRoute,
  parsePositiveInt,
  missingPathParam,
} = require('./_helpers');

function createRouter(deps) {
  const { channelService } = deps;
  if (!channelService) {
    throw new Error('createRouter(channels): channelService is required');
  }
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const channels = await channelService.getAllChannelNumbers();
      channels.sort((a, b) => (a.number < b.number ? -1 : 1));
      res.send(channels);
    })
  );

  // Legacy callers used `GET /api/channelNumbers`; the new path is
  // `/api/channels/numbers`. Same payload as `GET /` for now — Phase 5
  // narrows the surface once the typed client lands.
  router.get(
    '/numbers',
    asyncRoute(async (req, res) => {
      const channels = await channelService.getAllChannelNumbers();
      channels.sort(
        (a, b) =>
          parseInt(a.number || a, 10) - parseInt(b.number || b, 10)
      );
      res.send(channels);
    })
  );

  router.get(
    '/:number',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');

      const channel = await channelService.getChannel(number);
      if (channel == null) {
        return apiError(res, NOT_FOUND, 'Channel not found', {
          number: req.params.number,
        });
      }

      // ?programless=true strips the programs array; closes the legacy
      // `/api/channel/programless/:number` path with a query flag.
      if (req.query && req.query.programless === 'true') {
        const copy = {};
        Object.keys(channel).forEach((key) => {
          if (key !== 'programs') copy[key] = channel[key];
        });
        return res.send(copy);
      }

      res.send(channel);
    })
  );

  router.get(
    '/:number/programs',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');

      const channel = await channelService.getChannel(number);
      if (channel == null) {
        return apiError(res, NOT_FOUND, 'Channel not found', {
          number: req.params.number,
        });
      }
      const programs = channel.programs;
      if (typeof programs === 'undefined') {
        return apiError(res, NOT_FOUND, 'Channel has no programs', {
          number: req.params.number,
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      const transformStream = JSONStream.stringify();
      transformStream.pipe(res);
      for (let i = 0; i < programs.length; i += 1) {
        transformStream.write(programs[i]);
         
        await throttle();
      }
      transformStream.end();
    })
  );

  router.get(
    '/:number/description',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');

      const channel = await channelService.getChannel(number);
      if (channel == null) {
        return apiError(res, NOT_FOUND, 'Channel not found', {
          number: req.params.number,
        });
      }
      res.send({
        number: channel.number,
        icon: channel.icon,
        name: channel.name,
        stealth: channel.stealth,
      });
    })
  );

  router.post(
    '/',
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
    '/:number',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');
      const body = req.body || {};
      // The body may carry its own `number` (legacy clients); we accept it but
      // the path parameter is authoritative.
      await channelService.saveChannel(number, { ...body, number });
      res.send({ number });
    })
  );

  router.delete(
    '/:number',
    asyncRoute(async (req, res) => {
      const number = parsePositiveInt(req.params.number);
      if (number == null) return missingPathParam(res, 'number');
      await channelService.deleteChannel(number);
      res.send({ deleted: true, number });
    })
  );

  return router;
}

module.exports = { createRouter };
