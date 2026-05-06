# SQLite Backup And Restore

Phase 3 moves Ayoitson persistence to `.ayoitson/db.sqlite` with SQLite WAL
journaling enabled. Do not rely on `cp -r .ayoitson/` for live backups because
it can capture the database and WAL files at different moments.

## Backup

```bash
sqlite3 .ayoitson/db.sqlite ".backup '/path/to/backups/ayoitson-$(date +%Y%m%d).sqlite'"
```

## Restore

Stop Ayoitson before replacing the database file.

```bash
cp /path/to/backups/ayoitson-20260505.sqlite .ayoitson/db.sqlite
```

Start Ayoitson and verify channels, Plex servers, and settings load before
deleting older backups or any `.dizquetv-legacy-*` archive.

— Codex (OpenAI), Lane Delta · 2026-05-05
