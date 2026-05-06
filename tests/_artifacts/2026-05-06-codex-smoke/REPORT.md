# Codex Phase 3 + Phase 4 Operator Smoke - 2026-05-06

Signed: Codex (OpenAI), Lane Epsilon · 2026-05-06

Final disposition: **SMOKE-FAIL-ui-api-drift**

The protected migration succeeded and the runtime API booted. The operator UI smoke failed because the legacy Angular UI still calls pre-Phase-4 API routes and shapes after the Alpha REST redesign.

## Results

| Step                                       | Result                     | Evidence                                                                                                                                                                                              |
| ------------------------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Back up `.dizquetv`                     | PASS                       | `.dizquetv.backup-pre-codex-smoke-2026-05-06` created. Top-level count matched original: `21 == 21`.                                                                                                  |
| 2. Run diskdb -> SQLite migration          | PASS                       | `migrate-db.log`; `.ayoitson/db.sqlite` created.                                                                                                                                                      |
| 3. Verify row counts                       | PASS                       | channels `1`, programs `34`, plex_servers `1`, settings `8`, play_times `1`, cache_images `0`.                                                                                                        |
| 4. Verify legacy archive                   | PASS                       | `.dizquetv-legacy-2026-05-06T15-30-40-409Z` created beside `.ayoitson`.                                                                                                                               |
| 5. Rerun migration for idempotence         | PASS                       | `migrate-db-second.log`; second run skipped, archive count stayed `1`, row counts unchanged.                                                                                                          |
| 6. Boot runtime                            | PASS                       | `npm start` booted on `http://localhost:8000`; `/api/health` returned `200`.                                                                                                                          |
| 7. `GET /api/version` without auth         | NOT-VERIFIABLE-AS-PROMPTED | Prompt expected no-auth version output, but Phase 4 OpenAPI marks `/api/version` auth-required. No-auth request returned structured `401 UNAUTHORIZED`, which matches current spec.                   |
| 8. `GET /api/version` with smoke key       | PASS                       | Returned `{"ayoitson":"1.5.5","dizquetv":"1.5.5","ffmpeg":"8.1.1","nodejs":"v22.22.2"}`.                                                                                                              |
| 9. `GET /api/plex-servers` without key     | PASS                       | Returned structured `401` envelope: `{"code":"UNAUTHORIZED","message":"Missing X-API-Key header"}`.                                                                                                   |
| 10. `GET /api/plex-servers` with smoke key | PASS                       | Returned `200`; Plex server token was not present in response.                                                                                                                                        |
| 11. Home / Guide screenshot                | PASS                       | `01-home.png`; migrated channel and programs render on the guide.                                                                                                                                     |
| 12. Channels screenshot                    | FAIL                       | `02-channels.png`; Channels table is empty even though migrated channel exists. `GET /api/channels` returns `[1]`, which the legacy Angular view does not render as channel rows.                     |
| 13. Channel editor screenshot              | FAIL                       | `03-channel-editor.png`; direct route to channel editor did not show a usable migrated channel editor.                                                                                                |
| 14. Settings screenshot                    | FAIL                       | `04-settings.png`; settings panes still call legacy endpoints such as `/api/ffmpeg-settings`, while Phase 4 exposes `/api/settings/ffmpeg`. FFmpeg path did not populate.                             |
| 15. Plex Servers screenshot                | PARTIAL                    | `05-plex-servers.png`; migrated Plex server name/URI appears, but UI status check reports `error` because legacy frontend routes still call old API shapes such as `/api/plex-servers/foreignstatus`. |
| 16. Shutdown runtime                       | PASS                       | `npm start` process was terminated after smoke capture.                                                                                                                                               |
| 17. Cleanup temporary smoke key            | PASS                       | Temporary Codex smoke API key was deleted from `api_keys`; raw smoke-key files were removed.                                                                                                          |

## Failure Detail

Fresh Bug Register entry filed: `BUG-SMOKE-UI-API-DRIFT`.

Observed frontend drift:

- `web/services/dizquetv.js` still calls old settings endpoints: `/api/plex-settings`, `/api/ffmpeg-settings`, `/api/xmltv-settings`, `/api/hdhr-settings`.
- Channel editor helpers still call old channel endpoints: `/api/channel/{number}`, `/api/channel/description/{number}`, `/api/channel/programless/{number}`, `/api/channel/programs/{number}`, `/api/channelNumbers`, and mutating `/api/channel` routes.
- Plex helper routes still use old shapes for create/update/delete/status in several places.

Per prompt: because final disposition is `SMOKE-FAIL-*`, Tasks F and G must not proceed until Founder reviews and the UI/API drift is fixed or explicitly waived.
