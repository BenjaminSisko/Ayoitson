# Changelog

All notable Ayoitson changes are tracked here.

## [Unreleased]

### Added

- Phase 7 release-engineering controls: HTTPS certificate/key startup,
  development mkcert helper, audit log API, blocking security workflow,
  Dependabot config, CycloneDX SBOM generation, and cosign keyless signing for
  release artifacts.
- SQLite backup/restore runbook, `npm run backup` wrapper, and authenticated
  `GET /api/admin/backup` database snapshot export.

### Changed

- Production dependency audit is clean after updating `express-fileupload`,
  `i18next-fs-backend`, and `unzipper`.
- Replaced the vulnerable `node-ssdp` dependency with a local minimal SSDP
  responder.
- Confirmed zlib package/license metadata while preserving upstream
  dizqueTV/pseudotv-plex notices.

### Security

- Audit log now records authentication failures, API-key lifecycle events,
  channel and Plex-server mutations, settings changes, FFmpeg path changes,
  and Plex token reads without logging raw secrets.
