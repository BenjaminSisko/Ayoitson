// tests/alpha/i18n-locales.test.js
//
// BUG-I18NEXT — the i18next loadPath uses {{lng}} interpolation. Without an
// allowlist, an attacker can pass `..` via the Accept-Language header to
// read arbitrary JSON files relative to the locales directory. Phase 4
// closes that with src/lib/i18n-locales.js.
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  loadAllowedLocales,
  safeLng,
  createSafeLanguageDetector,
} = require('../../src/lib/i18n-locales');

describe('i18next locale allowlist (BUG-I18NEXT)', () => {
  test('loadAllowedLocales reads JSON files and produces a set', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-'));
    try {
      fs.writeFileSync(path.join(tempRoot, 'en.json'), '{}');
      fs.writeFileSync(path.join(tempRoot, 'fr.json'), '{}');
      fs.writeFileSync(path.join(tempRoot, 'de-DE.json'), '{}');
      // bad files
      fs.writeFileSync(path.join(tempRoot, '..bad.json'), '{}');
      fs.writeFileSync(path.join(tempRoot, '..%2e%2e.json'), '{}');
      const allowed = loadAllowedLocales(tempRoot);
      expect(allowed.has('en')).toBe(true);
      expect(allowed.has('fr')).toBe(true);
      expect(allowed.has('de-DE')).toBe(true);
      expect(allowed.has('..bad')).toBe(false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('loadAllowedLocales falls back to ["en"] on missing dir', () => {
    const allowed = loadAllowedLocales(
      '/nonexistent/path/that/will/never/exist'
    );
    expect(allowed.has('en')).toBe(true);
  });

  test('safeLng allows known codes and rejects path-traversal candidates', () => {
    const allowed = new Set(['en', 'fr']);
    expect(safeLng(allowed, 'en')).toBe('en');
    expect(safeLng(allowed, 'fr')).toBe('fr');
    expect(safeLng(allowed, '../etc/passwd')).toBe('en');
    expect(safeLng(allowed, '../../secrets')).toBe('en');
    expect(safeLng(allowed, 'en/../../../etc/passwd')).toBe('en');
    expect(safeLng(allowed, '..')).toBe('en');
    expect(safeLng(allowed, undefined)).toBe('en');
    expect(safeLng(allowed, 'zh-CN')).toBe('en'); // shape valid but not allowed
  });

  test('SafeLanguageDetector wraps the upstream detector and clamps to allowlist', () => {
    class Stub {
      static type = 'languageDetector';
      detect() {
        return '../../../etc/passwd';
      }
      cacheUserLanguage() {}
    }
    const Safe = createSafeLanguageDetector(Stub, {
      allowed: new Set(['en']),
      fallback: 'en',
    });
    const inst = new Safe();
    expect(inst.detect({}, {})).toBe('en');
  });

  test('SafeLanguageDetector returns first allowed entry when upstream returns array', () => {
    class Stub {
      static type = 'languageDetector';
      detect() {
        return ['../etc/passwd', 'fr', 'de'];
      }
      cacheUserLanguage() {}
    }
    const Safe = createSafeLanguageDetector(Stub, {
      allowed: new Set(['en', 'fr']),
      fallback: 'en',
    });
    const inst = new Safe();
    expect(inst.detect({}, {})).toBe('fr');
  });
});
