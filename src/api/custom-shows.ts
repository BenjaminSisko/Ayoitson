// @ts-nocheck
// src/api/custom-shows.js
//
// Custom shows resource. Mirrors the filler-lists shape.
//
//   GET    /         list
//   POST   /         create
//   GET    /:id      read
//   PUT    /:id      update
//   DELETE /:id      delete
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');

const { apiError, VALIDATION_ERROR, NOT_FOUND } = require('../lib/errors');
const { asyncRoute, missingPathParam } = require('./_helpers');

function createRouter(deps) {
  const { customShowDB } = deps;
  if (!customShowDB) {
    throw new Error('createRouter(custom-shows): customShowDB is required');
  }
  const router = express.Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const shows = await customShowDB.getAllShowsInfo();
      res.send(shows);
    })
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      if (!req.body || typeof req.body !== 'object') {
        return apiError(
          res,
          VALIDATION_ERROR,
          'Body must be a custom show object'
        );
      }
      const id = await customShowDB.createShow(req.body);
      res.status(201).send({ id });
    })
  );

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = req.params.id;
      if (!id) return missingPathParam(res, 'id');
      const show = await customShowDB.getShow(id);
      if (show == null) {
        return apiError(res, NOT_FOUND, 'Custom show not found', { id });
      }
      res.send(show);
    })
  );

  router.put(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = req.params.id;
      if (!id) return missingPathParam(res, 'id');
      await customShowDB.saveShow(id, req.body);
      res.send({ updated: true, id });
    })
  );

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = req.params.id;
      if (!id) return missingPathParam(res, 'id');
      await customShowDB.deleteShow(id);
      res.send({ deleted: true, id });
    })
  );

  return router;
}

module.exports = { createRouter };
