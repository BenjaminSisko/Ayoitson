-- Phase 4 — API key authentication (Lane Epsilon)
-- Closes F1 (no auth on /api/*) and F7 (CSRF) by introducing
-- argon2id-hashed API keys delivered via the X-API-Key header.

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hashed_key TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_at
  ON api_keys(revoked_at);

INSERT OR IGNORE INTO schema_version (version) VALUES (2);
