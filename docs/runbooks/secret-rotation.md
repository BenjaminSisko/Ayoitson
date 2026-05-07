# Secret Rotation Runbook

## Master API Key

1. Create a replacement key from Settings -> API Keys, or run the first-run
   script with force from the host:

   ```sh
   AYOITSON_FIRST_RUN_FORCE=1 node scripts/first-run.js
   ```

2. Store the new key in the operator password manager.
3. Update clients or browser setup that use the old key.
4. Revoke the old key from Settings -> API Keys, or directly in SQLite:

   ```sh
   sqlite3 .ayoitson/db.sqlite \
     "UPDATE api_keys SET revoked_at = datetime('now') WHERE id = '<old-key-id>';"
   ```

5. Confirm the old key receives `401` on `/api/health`-adjacent protected
   routes, such as `/api/channels`.

## Plex Tokens

1. Rotate the token in Plex.
2. Update each affected Plex server in Ayoitson Settings.
3. Confirm `/api/plex-servers` returns server metadata with tokens redacted.
4. Confirm affected channels still stream.
5. Check `.ayoitson/audit.log` for `plex_server.updated` and `token.read`
   entries.

## Local Secret Files

After copying one-time key files into a password manager, remove local copies:

```sh
rm "/Users/benny/Documents/Ayoitson-Obsidian-Vault/.secrets/master-api-key-v0.5.0.txt"
rm "/Users/benny/Documents/New project 5/Ayoitson/.ayoitson/master-api-key.txt"
```

Never commit `.ayoitson/`, `.secrets/`, certificate private keys, or logs that
contain operational identifiers.
