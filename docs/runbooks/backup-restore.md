# SQLite Backup And Restore

Ayoitson stores runtime state in `${AYOITSON_DATABASE}/db.sqlite` with SQLite
WAL journaling enabled. Use SQLite's online `.backup` API for live backups; do
not rely on `cp -r .ayoitson/` while the app is running because the database,
WAL, and shared-memory files can be captured at different moments.

## What To Back Up

- `${AYOITSON_DATABASE}/db.sqlite` via `.backup`
- The master encryption key, if this install uses the generated file:
  `~/.ayoitson-master-key`
- Any operator-managed runtime assets under `${AYOITSON_DATABASE}/images/`,
  `${AYOITSON_DATABASE}/custom.css`, or equivalent mounted data paths
- The current API key in your password manager. Raw API keys are not recoverable
  from the database because only argon2id hashes are stored.

Preserve permissions when copying files between hosts:

- Data directory: `0700`
- SQLite backup files: `0600`
- `~/.ayoitson-master-key`: `0600`
- Do not store backups in a public web root or synced folder with broad sharing.

## CLI Backup

Preferred one-shot wrapper:

```bash
npm run backup -- --output /path/to/backups/ayoitson-$(date +%Y%m%d-%H%M%S).sqlite
```

Without `--output`, the wrapper writes to
`${AYOITSON_DATABASE:-.ayoitson}/backups/ayoitson-<timestamp>.sqlite` and sets
the backup file mode to `0600`.

Equivalent raw SQLite command:

```bash
sqlite3 "${AYOITSON_DATABASE:-.ayoitson}/db.sqlite" ".backup '/path/to/backups/ayoitson-$(date +%Y%m%d-%H%M%S).sqlite'"
chmod 600 /path/to/backups/ayoitson-*.sqlite
```

## API Backup

Authenticated operators with `*`, `admin`, or `admin:backup` scope can download
a point-in-time database snapshot:

```bash
curl -fS \
  -H "X-API-Key: ${AYOITSON_API_KEY}" \
  -o /path/to/backups/ayoitson-api-$(date +%Y%m%d-%H%M%S).sqlite \
  http://127.0.0.1:8000/api/admin/backup
chmod 600 /path/to/backups/ayoitson-api-*.sqlite
```

The endpoint streams a temporary SQLite `.backup` snapshot and removes the
temporary server-side file after the download completes.

## Restore

1. Stop Ayoitson.
2. Preserve the broken/current database before replacing it:

   ```bash
   cp -p "${AYOITSON_DATABASE:-.ayoitson}/db.sqlite" \
     "${AYOITSON_DATABASE:-.ayoitson}/db.sqlite.pre-restore-$(date +%Y%m%d-%H%M%S)"
   ```

3. Restore the backup and permissions:

   ```bash
   install -m 600 /path/to/backups/ayoitson-20260507-120000.sqlite \
     "${AYOITSON_DATABASE:-.ayoitson}/db.sqlite"
   ```

4. Restore `~/.ayoitson-master-key` if this is a different host and the install
   uses the generated key-file mode. Keep it mode `0600`.
5. Start Ayoitson.
6. Verify:
   - `/api/health` returns `200`
   - channels list and channel editor load
   - settings load, especially FFmpeg and XMLTV settings
   - Plex servers are listed and Plex library browsing works
   - one known channel streams

Only delete `.dizquetv-legacy-*`, `.dizquetv.backup-*`, or
`db.sqlite.pre-restore-*` files after the restored app has been verified.

## Disaster Recovery

If the SQLite database is lost but the master encryption key remains available,
restore the latest `.backup` file and the app can decrypt existing Plex tokens.

If the master encryption key is lost, channel schedules, settings, API-key
hashes, filler lists, and guide metadata can still be recovered from a database
backup, but encrypted Plex access tokens cannot be decrypted. Remove and
recreate each Plex server from the UI or API so Ayoitson stores fresh encrypted
tokens under the new key.

If raw API keys are lost, the hashes in SQLite still allow already-configured
clients to keep working, but the raw values cannot be printed again. Use a
still-working admin key to create a replacement, or stop the app and revoke /
reset keys through a controlled maintenance procedure.

— Codex (OpenAI), Lane Delta · 2026-05-07
