---
type: security-review
status: active
last-updated: 2026-05-07
pass: 2
reviewer: Marcus Reed (issm-security-reviewer)
date: 2026-05-07
commit-base: eba24d7
prior-pass: "Security Review - Marcus - 2026-05-06"
vault-source: "/Users/benny/Documents/Ayoitson-Obsidian-Vault/Security Review - Marcus - 2026-05-07 Pass 2.md"
---

# Security Review - Marcus - 2026-05-07 Pass 2

This in-repo copy mirrors the vault source of truth for the Pass 2 security review. The vault itself is not a git repository on this workstation, so this file gives the `codex/security/marcus-pass-2` branch a review artifact while the canonical note remains in `/Users/benny/Documents/Ayoitson-Obsidian-Vault/`.

## Executive Summary

Pass 2 reviewed `main` / `v0.7.0` at `eba24d7` after the Phase 6 TypeScript migration. Phase 6 preserved the major security controls, and Gamma's `SafeFFmpegArg` work partially mitigates Pass 1 F12 by blocking dangerous URL schemes at FFmpeg `-i` positions. Older findings remain open around `/api/events`, API-key persistence, `/api/cache/images`, tokenized artwork URLs, and dependency advisories.

**New Pass 2 findings:** 0 CRITICAL / 1 HIGH / 3 MEDIUM / 0 LOW.

**New HIGH:** F22 - on a fresh database, unauthenticated `POST /api/auth/setup` can mint the first master API key from any reachable client before the operator does. Evidence: `src/api/index.ts:77-79`, `src/api/auth.ts:28-53`, `docs/openapi.yaml:58-79`, `tests/security/api-auth-baseline.test.js:136-139`.

**New MEDIUM batch:** F23 audit log absent, F24 production `i18next-fs-backend` advisory remains despite code-path mitigation, F25 OSV gate is noisy and scans dev/tool lockfiles.

## Verification

| Command | Result |
|---|---|
| `npm run test:unit -- tests/security tests/gamma/ffmpeg-args.test.js tests/gamma/ffmpeg-sanitizers.test.js tests/gamma/plex-transcoder-http.test.js tests/alpha/plex-http-wrapper.test.js tests/alpha/api-guide.test.js tests/alpha/api-settings.test.js` | PASS - 18 files / 79 tests |
| `npm run secret-scan` | PASS - no leaks found |
| `npm run audit` | FAIL - 3 high production advisories: `i18next-fs-backend`, `ip` via `node-ssdp` |
| `/Users/benny/go/bin/osv-scanner scan source --recursive --no-ignore .` | FAIL - 10 package advisories |

## Pass 1 Dispositions

- F11 `/api/events` SSE bypass: STILL OPEN.
- F12 operator FFmpeg inputs: MITIGATED (partial) by `SafeFFmpegArg`; residual local absolute path and save-time validation gap remains.
- F13 API key in `localStorage`: STILL OPEN.
- F14 foreign Plex status check probe: STILL OPEN, private-IP SSRF mostly mitigated by HTTP wrapper.
- F15 event payload redaction: STILL OPEN.
- F16 argon2 verify once per active key: STILL OPEN.
- F17 settings PUT arbitrary fields: STILL OPEN.
- F18 public `/cache/images` read route: WONTFIX for read-side Plex compatibility; API DELETE write-side remains tracked separately.
- F19 npm audit `node-ssdp` / `ip`: STILL OPEN.
- F20 `unzipper@0.10.14`: STILL OPEN.
- F21 redirect location in HTTP wrapper errors: STILL OPEN, LOW/INFO.

## Recommended Sprint Priorities

1. F22 first-run remote claim.
2. F11 `/api/events` auth/CORS bypass.
3. `REOPENED-F1/F7-CACHE-IMAGES` API DELETE auth gap.
4. F13 API key in `localStorage`.
5. Phase 7 dependency/audit gate bundle: F23/F24/F25 plus SBOM and release hardening.

Closing model: Codex (OpenAI) on Continue Ayoitson flow · 2026-05-07

— Codex (OpenAI), Lane Epsilon · 2026-05-07
