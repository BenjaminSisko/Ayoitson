PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);

CREATE TABLE IF NOT EXISTS channels (
  number INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  group_title TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES channels(number) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  UNIQUE (channel_id, position)
);

CREATE INDEX IF NOT EXISTS idx_programs_channel_position
  ON programs(channel_id, position);

CREATE TABLE IF NOT EXISTS filler_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS filler_programs (
  filler_id TEXT NOT NULL REFERENCES filler_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (filler_id, position)
);

CREATE TABLE IF NOT EXISTS custom_shows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS custom_show_programs (
  show_id TEXT NOT NULL REFERENCES custom_shows(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (show_id, position)
);

CREATE TABLE IF NOT EXISTS plex_servers (
  name TEXT PRIMARY KEY,
  uri TEXT NOT NULL,
  client_identifier TEXT,
  access_token_encrypted BLOB NOT NULL,
  access_token_iv BLOB NOT NULL,
  access_token_tag BLOB NOT NULL,
  arGuide INTEGER NOT NULL DEFAULT 0,
  arChannels INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS settings (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS play_times (
  channel_id INTEGER NOT NULL REFERENCES channels(number) ON DELETE CASCADE,
  program_key TEXT NOT NULL,
  position_ms INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (channel_id, program_key)
);

CREATE TABLE IF NOT EXISTS cache_images (
  hash TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  local_path TEXT NOT NULL,
  mime_type TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cache_images_source_url
  ON cache_images(source_url);
