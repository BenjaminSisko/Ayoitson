# dizqueTV Baseline Fixture

This is a synthetic, sanitized `.dizquetv/` fixture for Phase 3 SQLite migration
tests. No personal Plex library data or live tokens are included.

## Provenance

- Created: 2026-05-05
- Source: hand-authored synthetic data based on the documented dizqueTV diskdb
  shape from the Phase 1 placeholder manifest and the Phase 3 JSON schema notes.
- Reason: no real `~/.dizquetv/` or backup folder was visible on this
  workstation during Phase 3 pre-flight.

## Sanitization

- Plex access token is the deterministic test-only value
  `FIXTURE_TOKEN_REDACTED`.
- Plex URI uses TEST-NET-3 address `http://203.0.113.10:32400`.
- Media titles, local paths, channel names, and identifiers are synthetic.
- Cross-file references are intentionally small but internally consistent.

— Codex (OpenAI), Lane Delta · 2026-05-05
