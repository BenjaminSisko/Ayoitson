# First-Run Runbook — Master API Key

After installing Ayoitson, every `/api/*` route is gated by an `X-API-Key`
header. The first thing you need to do on a fresh install is mint the
master API key.

## TL;DR

```sh
# From the Ayoitson repo root
node scripts/first-run.js
```

Copy the printed key. You will not see it again.

## What the script does

1. Opens the SQLite database at `${AYOITSON_DATABASE}` (default
   `./.ayoitson/db.sqlite`) and applies any pending migrations.
2. Refuses to run if any non-revoked API key already exists, unless you
   override with `AYOITSON_FIRST_RUN_FORCE=1`.
3. Generates a 32-byte CSPRNG key, prefixes it with `ayo_`, and shows it
   to you on stdout.
4. Stores the argon2id hash in the `api_keys` table. The raw key is
   never written to disk and never appears in logs or backups.
5. Prompts you to type the literal phrase `I have copied the key` to
   confirm. If you mistype, the key is still active — revoke it
   immediately (see below) and re-run.

## Using the key

Every API call must include the header:

```
X-API-Key: ayo_<your key here>
```

Example:

```sh
curl -H "X-API-Key: ayo_abc..." http://localhost:8000/api/channels
```

The frontend reads the key from local storage; paste it once via the
Settings → API Keys panel (Phase 4 Beta deliverable).

## Rotation / revocation

The key lives in the `api_keys` table. To revoke:

```sh
sqlite3 .ayoitson/db.sqlite \
  "UPDATE api_keys SET revoked_at = datetime('now') WHERE id = '<id>';"
```

Then run `scripts/first-run.js` with `AYOITSON_FIRST_RUN_FORCE=1` to
mint a replacement.

## Loss of the master key

If you lose the key and have no other unrevoked key, you have two options:

1. **Direct database edit** (operator on the host): revoke the lost key
   row in `api_keys`, then run `AYOITSON_FIRST_RUN_FORCE=1 node scripts/first-run.js`
   to mint a replacement.
2. **Reinstall**: delete `.ayoitson/db.sqlite` and start over (you will
   also lose channel configuration — back up first).

This is the operator-self-service threat model. Ayoitson is single-tenant
self-hosted; we do not provide remote recovery.
