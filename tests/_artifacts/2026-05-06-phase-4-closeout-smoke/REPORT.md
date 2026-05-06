# Phase 4 Closeout Smoke - 2026-05-06

Disposition: SMOKE-PASS

Backend: http://127.0.0.1:18831
UI static/proxy: http://127.0.0.1:18931
Temp install: /var/folders/hv/62tz2zmd3gb6xzb8g5dh4pzc0000gn/T/ayoitson-phase4-closeout-pE8dtM

| Status | Step                              | Detail                                                                                                                 |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| PASS   | Prepared isolated legacy fixture  | temp=/var/folders/hv/62tz2zmd3gb6xzb8g5dh4pzc0000gn/T/ayoitson-phase4-closeout-pE8dtM; ffmpeg=/opt/homebrew/bin/ffmpeg |
| PASS   | First-run flow minted API key     | raw key captured in memory only; output redacted                                                                       |
| PASS   | Migrated synthetic legacy fixture | channels=1; plex_servers=1; settings=8                                                                                 |
| PASS   | Backend health reached 200        | http://127.0.0.1:18831                                                                                                 |
| PASS   | Authenticated /api/version        | {"name":"Ayoitson","version":"0.5.0","ffmpeg":"8.1.1","nodejs":"v22.22.2"}                                             |
| PASS   | API Keys metadata list            | count=1; raw key absent                                                                                                |
| PASS   | API Keys create                   | metadata=6667b41d0e7943c6; raw key redacted                                                                            |
| PASS   | API Keys revoke                   | 6667b41d0e7943c6                                                                                                       |
| PASS   | List migrated channels            | count=1                                                                                                                |
| PASS   | Channel CRUD via API              | create/read/update/delete succeeded for channel 999                                                                    |
| PASS   | Stream channel playlist           | media-player/1.m3u?fast=1 returned an M3U playlist                                                                     |
| PASS   | /v2 settings panes                | API Keys, Plex, and FFmpeg panes loaded; ffmpegPath=/opt/homebrew/bin/ffmpeg                                           |

Raw API keys were captured only in process memory and are not stored in this report.

— Codex (OpenAI), Lane — · 2026-05-06
