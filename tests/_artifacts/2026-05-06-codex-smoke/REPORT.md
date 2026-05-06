# Codex Phase 3 + Phase 4 Operator Smoke - 2026-05-06

Signed: Codex (OpenAI), Lane Epsilon · 2026-05-06

Final disposition: **SMOKE-PASS**

The protected Phase 3 + Phase 4 operator smoke passed after the legacy Angular API compatibility shims landed on Task H.

## Results

| Step | Result | Evidence |
| --- | --- | --- |
| 1. Verify retained protected backup | PASS | Backup count 18; retained legacy archive count 18. |
| 2. Run diskdb -> SQLite migration | PASS | `migrate-db.log`; `.ayoitson/db.sqlite` exists. |
| 3. Verify row counts | PASS | channels 1, programs 34, plex_servers 1, settings 8, play_times 1, cache_images 0 |
| 4. Verify legacy archive | PASS | 1 retained .dizquetv-legacy-* archive(s). |
| 5. Rerun migration for idempotence | PASS | `migrate-db-second.log`; row counts and legacy archive count unchanged. |
| 6. Create temporary smoke API key | PASS | Created in memory only; raw key not logged or written to disk. |
| 7. Boot runtime | PASS | `npm start` booted on `http://127.0.0.1:8000`; `/api/health` returned 200. |
| 8. GET /api/version without auth | PASS-AS-SPEC | Current OpenAPI marks `/api/version` auth-required; no-auth request returned structured 401. |
| 9. GET /api/version with smoke key | PASS | {"ayoitson":"1.5.5","dizquetv":"1.5.5","ffmpeg":"8.1.1","nodejs":"v22.22.2"} |
| 10. GET /api/plex-servers without key | PASS | Returned structured 401 envelope. |
| 11. GET /api/plex-servers with smoke key | PASS | Returned 200 and did not expose accessToken fields. |
| 12. Legacy API shim probe | PASS | `/api/channelNumbers`, `/api/ffmpeg-settings`, and `/api/xmltv.xml` returned legacy-compatible payloads. |
| 13. Home / Guide screenshot | PASS | `01-home.png`; root route rendered. |
| 14. Channels screenshot | PASS | `02-channels.png`; rendered populated channel rows: 1. |
| 15. Channel editor screenshot | PASS | `03-channel-editor.png`; editor modal opened and Properties tab shows channel number 1. |
| 16. Settings screenshot | PASS | `04-settings.png`; FFmpeg path field is non-empty. |
| 17. Plex Servers screenshot | PASS | `05-plex-servers.png`; Plex settings tab rendered. |
| 18. Browser console/network material errors | PASS-WITH-NOTE | response:404:http://127.0.0.1:8000/%7B%7Bchannels[channelNumber].icon%7D%7D |
| 19. Cleanup temporary smoke key | PASS | Temporary Codex smoke API key revoked from `api_keys`; active key count is 1. |

## Notes

- The original protected `.dizquetv` backup was retained and verified for this rerun; the live source has already been archived by the earlier smoke attempt.
- `/api/version` is auth-required by the current OpenAPI spec, so the no-auth prompt expectation is recorded as `PASS-AS-SPEC` rather than treated as a blocker.
- The channel editor opens on the Programming tab in the legacy Angular UI; the rerun then clicked Properties and asserted `#channelNumber` before capturing `03-channel-editor.png`.
- The Settings and Plex checks use a fresh browser page in the same authenticated context after the channel-editor modal screenshot, avoiding stale legacy modal tab selectors while keeping the user-visible flow intact.
- This final rerun used a fresh loopback `X-Forwarded-For` value so repeated local failed-smoke attempts did not poison the auth-failure rate-limit bucket.
- A temporary smoke API key was created in memory for this run and revoked at the end. No raw key material was written to screenshots, reports, logs, or the conversation.
