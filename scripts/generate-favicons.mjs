#!/usr/bin/env node
/**
 * Generate favicons + apple-touch-icon + PWA-style icons for Ayoitson.
 *
 * Source: web/public/logo-transparent.png
 * Output: web/public/{favicon.ico,icon-192.png,icon-512.png,apple-touch-icon.png}
 *
 * Run with: node scripts/generate-favicons.mjs
 *
 * The transparent logo is composited on a flat --ayo-cream (#F5EDE0) background
 * for raster favicons so the brand stays readable on any browser chrome.
 *
 * — Claude (Anthropic), Lane Beta · 2026-05-06
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'web', 'public', 'logo-transparent.png');
const OUT = path.join(ROOT, 'web', 'public');

// --ayo-cream as RGB
const CREAM = { r: 0xf5, g: 0xed, b: 0xe0, alpha: 1 };

/**
 * Compose the transparent logo onto a cream background, fit to a square,
 * then resize to the target size.
 */
async function composeOnCream(srcBuffer, size) {
  // Inner image is 90% of canvas to give breathing room
  const inner = Math.round(size * 0.9);
  const resizedLogo = await sharp(srcBuffer)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: CREAM,
    },
  })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function generate() {
  const src = await readFile(SRC);

  // PNG: 32, 64, 192, 512
  const png32 = await composeOnCream(src, 32);
  const png64 = await composeOnCream(src, 64);
  const png192 = await composeOnCream(src, 192);
  const png512 = await composeOnCream(src, 512);
  const png180 = await composeOnCream(src, 180);

  // For the .ico we embed 16/32/48 pngs (sharp doesn't write .ico natively;
  // we ship a 32px PNG renamed to .ico — modern browsers accept that).
  const png16 = await composeOnCream(src, 16);

  await writeFile(path.join(OUT, 'icon-192.png'), png192);
  await writeFile(path.join(OUT, 'icon-512.png'), png512);
  await writeFile(path.join(OUT, 'apple-touch-icon.png'), png180);
  await writeFile(path.join(OUT, 'favicon-32.png'), png32);
  await writeFile(path.join(OUT, 'favicon-16.png'), png16);

  // Build a real multi-size .ico: 16, 32, 48 PNG-encoded entries.
  const png48 = await composeOnCream(src, 48);
  const ico = buildIco([
    { size: 16, png: png16 },
    { size: 32, png: png32 },
    { size: 48, png: png48 },
    { size: 64, png: png64 },
  ]);
  await writeFile(path.join(OUT, 'favicon.ico'), ico);

  console.log('[favicons] wrote favicon.ico, icon-192/512.png, apple-touch-icon.png');
}

/**
 * Tiny .ico writer — header + ICONDIRENTRY[] + PNG payload per entry.
 * Spec: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function buildIco(entries) {
  const ICONDIR = 6;
  const ICONDIRENTRY = 16;
  let offset = ICONDIR + ICONDIRENTRY * entries.length;

  const headers = Buffer.alloc(ICONDIR + ICONDIRENTRY * entries.length);
  // ICONDIR
  headers.writeUInt16LE(0, 0); // reserved
  headers.writeUInt16LE(1, 2); // type 1 = icon
  headers.writeUInt16LE(entries.length, 4);

  const payloads = [];
  entries.forEach((entry, i) => {
    const sizeByte = entry.size >= 256 ? 0 : entry.size;
    const entryOffset = ICONDIR + ICONDIRENTRY * i;
    headers.writeUInt8(sizeByte, entryOffset + 0); // width
    headers.writeUInt8(sizeByte, entryOffset + 1); // height
    headers.writeUInt8(0, entryOffset + 2); // colors in palette
    headers.writeUInt8(0, entryOffset + 3); // reserved
    headers.writeUInt16LE(1, entryOffset + 4); // color planes
    headers.writeUInt16LE(32, entryOffset + 6); // bits per pixel
    headers.writeUInt32LE(entry.png.length, entryOffset + 8); // image size
    headers.writeUInt32LE(offset, entryOffset + 12); // image offset
    offset += entry.png.length;
    payloads.push(entry.png);
  });

  return Buffer.concat([headers, ...payloads]);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
