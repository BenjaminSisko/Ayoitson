// src/lib/init-assets.js
//
// First-boot asset seeding. Replaces the old, deeply-repetitive 8-block
// "if (!fs.existsSync(...)) copy file" pattern in index.js (was tagged
// BUG-TODO-REPETITIVE at index.js:308 with the comment
// `//TODO: this is getting so repetitive, do it better`).
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const fs = require('fs');
const path = require('path');
const unzip = require('unzipper');

/**
 * Ensure each named directory exists under DATABASE.
 *
 * @param {string} databaseDir - the resolved DATABASE root.
 * @param {string[]} subdirs - relative paths to mkdir -p.
 */
function ensureSubdirs(databaseDir, subdirs) {
  for (const sub of subdirs) {
    const full = path.join(databaseDir, sub);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
}

/**
 * Copy each `[srcRel, destRel]` pair from `resourcesDir` into `databaseDir`
 * if the destination doesn't already exist. Idempotent across restarts.
 */
function ensureSeedFiles(resourcesDir, databaseDir, pairs) {
  for (const [srcRel, destRel] of pairs) {
    const dest = path.join(databaseDir, destRel);
    if (fs.existsSync(dest)) continue;
    const src = path.resolve(path.join(resourcesDir, srcRel));
    const data = fs.readFileSync(src);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
  }
}

/**
 * Extract any zip bundles that haven't been extracted yet (font-awesome,
 * bootstrap). The destination dir name is given; if it exists we skip.
 */
function ensureExtractedZips(resourcesDir, databaseDir, bundles) {
  for (const bundle of bundles) {
    const destDir = path.join(databaseDir, bundle);
    if (fs.existsSync(destDir)) continue;
    const sourceZip = `${path.resolve(resourcesDir, bundle)}.zip`;
    const destinationPath = path.resolve(databaseDir);
    fs.createReadStream(sourceZip).pipe(unzip.Extract({ path: destinationPath }));
  }
}

/**
 * Top-level helper: replicates the legacy initDB asset-seeding behavior in
 * one tidy call.
 */
function seedRuntimeAssets({ databaseDir, resourcesDir, bundles }) {
  ensureSubdirs(databaseDir, [
    'images',
    'channels',
    'filler',
    'custom-shows',
    'cache',
    path.join('cache', 'images'),
  ]);

  const seedFiles = [
    ['ayoitson.png', 'images/ayoitson.png'],
    ['font.ttf', 'font.ttf'],
    ['generic-error-screen.png', 'images/generic-error-screen.png'],
    ['generic-offline-screen.png', 'images/generic-offline-screen.png'],
    ['generic-music-screen.png', 'images/generic-music-screen.png'],
    ['loading-screen.png', 'images/loading-screen.png'],
    ['black.png', 'images/black.png'],
    ['default-custom.css', 'custom.css'],
  ];
  ensureSeedFiles(resourcesDir, databaseDir, seedFiles);

  ensureExtractedZips(resourcesDir, databaseDir, bundles);
}

module.exports = {
  seedRuntimeAssets,
  ensureSubdirs,
  ensureSeedFiles,
  ensureExtractedZips,
};
