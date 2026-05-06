// @ts-nocheck
// src/api/filler.js
//
// Filler-lists resource. Mounted under /api/filler-lists with REST-uniform
// semantics; the legacy POST-on-{id} update became PUT-on-{id}.
//
//   GET    /                  list filler info
//   POST   /                  create
//   GET    /:id               read
//   PUT    /:id               update
//   DELETE /:id               delete
//   GET    /:id/channels      channels using this filler
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');

const { apiError, VALIDATION_ERROR, NOT_FOUND } = require('../lib/errors');
const { asyncRoute, missingPathParam } = require('./_helpers');

function createRouter(deps) {
  const { fillerDB } = deps;
  if (!fillerDB) throw new Error('createRouter(filler): fillerDB is required');
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const fillers = await fillerDB.getAllFillersInfo();
      res.send(fillers);
    })
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      if (!req.body || typeof req.body !== 'object') {
        return apiError(
          res,
          VALIDATION_ERROR,
          'Body must be a filler list object'
        );
      }
      const id = await fillerDB.createFiller(req.body);
      res.status(201).send({ id });
    })
  );

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = req.params.id;
      if (!id) return missingPathParam(res, 'id');
      const filler = await fillerDB.getFiller(id);
      if (filler == null) {
        return apiError(res, NOT_FOUND, 'Filler list not found', { id });
      }
      res.send(filler);
    })
  );

  router.put(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = req.params.id;
      if (!id) return missingPathParam(res, 'id');
      await fillerDB.saveFiller(id, req.body);
      res.send({ updated: true, id });
    })
  );

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = req.params.id;
      if (!id) return missingPathParam(res, 'id');
      await fillerDB.deleteFiller(id);
      res.send({ deleted: true, id });
    })
  );

  router.get(
    '/:id/channels',
    asyncRoute(async (req, res) => {
      const id = req.params.id;
      if (!id) return missingPathParam(res, 'id');
      const channels = await fillerDB.getFillerChannels(id);
      if (channels == null) {
        return apiError(res, NOT_FOUND, 'Filler list not found', { id });
      }
      res.send(channels);
    })
  );

  return router;
}

module.exports = { createRouter };
