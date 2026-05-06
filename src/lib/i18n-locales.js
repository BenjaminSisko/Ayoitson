// src/lib/i18n-locales.js
//
// Locale allowlist for i18next path interpolation. The legacy code passes
// `loadPath: '/locales/server/{{lng}}.json'` directly to i18next-fs-backend.
// If `lng` is set from a header, query string, or other operator-influenced
// source, an attacker can escape the locales directory via `..` segments and
// read arbitrary JSON files (BUG-I18NEXT, Marcus, 2026-05-04).
//
// We harden two ways:
//
//   1. Read the on-disk locales directory at startup and freeze the set of
//      allowed `lng` codes. Anything else is rejected.
//   2. Provide a request-time language detector wrapper that strips the
//      detected language to the allowlist before i18next consumes it.
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

'use strict';

const fs = require('fs');
const path = require('path');

// Even tighter than "anything in locales/server" — reject obvious bad
// shapes before we read disk. Locale codes are alpha + dashes only.
const LOCALE_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/;

function loadAllowedLocales(localesDir) {
  let entries;
  try {
    entries = fs.readdirSync(localesDir);
  } catch (err) {
    console.error(
      `i18n: could not read locales dir at ${localesDir}; defaulting to ['en']`,
      err && err.message
    );
    return new Set(['en']);
  }
  const allowed = new Set(['en']);
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const code = entry.slice(0, -'.json'.length);
    if (LOCALE_RE.test(code)) allowed.add(code);
  }
  return allowed;
}

/**
 * Wrap i18next-http-middleware's LanguageDetector so the detected language is
 * intersected with the allowlist before being applied. Anything outside the
 * allowlist is forced to the fallback (default: 'en').
 */
function createSafeLanguageDetector(LanguageDetector, options = {}) {
  const allowed = options.allowed instanceof Set
    ? options.allowed
    : new Set(options.allowed || ['en']);
  const fallback = options.fallback || 'en';

  // i18next-http-middleware expects a class with the static .type and
  // instance methods `detect`, `cacheUserLanguage`, etc. We compose around it.
  class SafeLanguageDetector extends LanguageDetector {
    detect(req, res) {
      const detected = super.detect(req, res);
      if (typeof detected === 'string' && allowed.has(detected)) {
        return detected;
      }
      if (Array.isArray(detected)) {
        for (const code of detected) {
          if (allowed.has(code)) return code;
        }
      }
      return fallback;
    }
  }
  return SafeLanguageDetector;
}

/**
 * Build the safe i18next backend options. The {{lng}} interpolation is still
 * used by i18next-fs-backend (we don't want to fork that), but because every
 * request goes through the SafeLanguageDetector (or the safeLng() filter on
 * direct i18next.changeLanguage calls), the value can never be operator-
 * controlled outside the allowlist.
 */
function buildBackendPaths(rootDir) {
  const localesDir = path.join(rootDir, 'locales', 'server');
  return {
    localesDir,
    loadPath: path.join(localesDir, '{{lng}}.json'),
    addPath: path.join(localesDir, '{{lng}}.json'),
  };
}

/**
 * Filter a candidate language code through the allowlist. Returns the code on
 * pass; the fallback otherwise. Used at the call sites that hand language to
 * i18next directly.
 */
function safeLng(allowed, candidate, fallback = 'en') {
  if (typeof candidate !== 'string') return fallback;
  if (!LOCALE_RE.test(candidate)) return fallback;
  if (!allowed.has(candidate)) return fallback;
  return candidate;
}

module.exports = {
  LOCALE_RE,
  loadAllowedLocales,
  createSafeLanguageDetector,
  buildBackendPaths,
  safeLng,
};
