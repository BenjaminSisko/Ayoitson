// @ts-nocheck
// src/api/upload.js
//
// Image upload endpoint. Mounted under /api/uploads.
//
//   POST /api/uploads/image
//
// Validation (carried forward from the Phase 1 hardening that closed
// F5-traversal and BUG-ERR-RAW-LEAK):
//
//   - Content-Type: multipart/form-data
//   - File <= 10 MB (enforced by express-fileupload at the wire)
//   - Filename rejected if it contains '/', '\', or '..'
//   - On-disk name is `{uuid}.{extension}`; original name returned in metadata only
//   - Errors return the structured envelope, never raw err
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { apiError, VALIDATION_ERROR, INTERNAL } = require('../lib/errors');
const { asyncRoute, hasUnsafeUploadName } = require('./_helpers');

function createStoredUploadName(originalName) {
  const extension = path.extname(originalName);
  return `${uuidv4()}${extension}`;
}

function getDatabaseDir() {
  return process.env.AYOITSON_DATABASE || process.env.DATABASE || '.ayoitson';
}

function createRouter(_deps) {
  const router = express.Router();

  router.post(
    '/image',
    asyncRoute(async (req, res) => {
      if (!req.files || !req.files.image) {
        return apiError(res, VALIDATION_ERROR, 'No file uploaded', {
          field: 'image',
        });
      }
      const logo = req.files.image;
      const originalName = logo.name;
      if (hasUnsafeUploadName(originalName)) {
        return apiError(res, VALIDATION_ERROR, 'Invalid upload filename', {
          field: 'image.name',
        });
      }
      const storedName = createStoredUploadName(originalName);
      const uploadDir = path.join(getDatabaseDir(), 'images', 'uploads');
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        await logo.mv(path.join(uploadDir, storedName));
      } catch (err) {
        // Never expose raw err to client (was BUG-ERR-RAW-LEAK pre-Phase 1).
        console.error('Image upload failed', err);
        return apiError(res, INTERNAL, 'File upload failed');
      }
      res.status(201).send({
        status: true,
        message: 'File is uploaded',
        data: {
          name: storedName,
          originalName,
          mimetype: logo.mimetype,
          size: logo.size,
          fileUrl: `${req.protocol}://${req.get('host')}/images/uploads/${storedName}`,
        },
      });
    })
  );

  return router;
}

module.exports = { createRouter };
