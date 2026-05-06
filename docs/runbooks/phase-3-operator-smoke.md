# Phase 3 Operator Smoke

This checklist is the manual fallback for the automated Phase 3/4 smoke. Use it after migrating a real operator install and before deleting any `.dizquetv-legacy-*` archive.

Signed: Codex (OpenAI), Lane Delta · 2026-05-06

## 1. Boot The App

1. Keep the legacy `.dizquetv-legacy-*` folder in place.
2. Start Ayoitson from the repo root with `npm start`.
3. Confirm `/api/health` returns HTTP 200 and `.ayoitson/db.sqlite` exists.

Screenshot placeholder: `tests/_artifacts/phase-3-operator-smoke/01-home.png`

## 2. Browse Channel Editor

1. Open the app in a browser.
2. Navigate to Channels.
3. Open one migrated channel and confirm the expected channel name, program list, logo/offline art, and filler references render.

Screenshot placeholder: `tests/_artifacts/phase-3-operator-smoke/02-channel-editor.png`

## 3. Exercise Plex Auth

1. Open Settings, then Plex Servers.
2. Confirm the migrated Plex server appears without showing the access token in the UI or API response.
3. Run the server status check and confirm it succeeds for the operator's LAN Plex server.

Screenshot placeholder: `tests/_artifacts/phase-3-operator-smoke/03-plex-servers.png`
