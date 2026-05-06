-- Ayoitson canonical SQLite schema draft.
-- Phase 1 only: this file defines the target contract for the Phase 3
-- diskdb -> SQLite cutover. It is not wired into runtime code yet.
--
-- Sources:
--   - Migration Plan - diskdb to SQLite.md
--   - JSON Schemas.md
--
-- Design notes:
--   - PRAGMA foreign_keys must be enabled by every SQLite connection.
--   - WAL is required for safer embedded reads while writes are serialized.
--   - JSON columns use TEXT plus json_valid() checks so Phase 3 DAOs can keep
--     low-value/extensible fields without schema churn.
--   - Plex tokens are stored only as aes-256-gcm ciphertext, IV, and auth tag.
--   - api_keys and audit_log are intentionally not created here; Epsilon owns
--     those Phase 4/7 contracts and will coordinate any schema additions.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA user_version = 1;

BEGIN;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY CHECK (version = 1),
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO schema_version (version, description)
VALUES (1, 'Initial Ayoitson SQLite schema draft')
ON CONFLICT(version) DO NOTHING;

CREATE TABLE IF NOT EXISTS channels (
  -- Channel.number is the stable external identifier used by M3U, XMLTV, HDHR,
  -- and /video?channel=... call sites.
  number INTEGER PRIMARY KEY CHECK (number BETWEEN 1 AND 9999),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  group_title TEXT,
  -- JSON metadata mirrors non-query-critical Channel fields such as icon,
  -- iconWidth, iconDuration, scheduleType, scheduleConfig, fillerCollections,
  -- transcodeConfig, watermark, onDemand, streamProtocol, stealth, fallback,
  -- and other legacy fields that Phase 3 DAOs must preserve.
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_number INTEGER NOT NULL
    REFERENCES channels(number)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  source TEXT NOT NULL
    CHECK (source IN ('plex', 'filler', 'flex', 'redirect', 'custom-show')),
  -- Provider-specific reference. For plex entries this includes serverName,
  -- ratingKey, media type, and cached display fields from PlexProgramRef.
  source_ref TEXT NOT NULL CHECK (json_valid(source_ref)),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (channel_number, position)
);

CREATE INDEX IF NOT EXISTS idx_programs_channel_position
  ON programs(channel_number, position);

CREATE INDEX IF NOT EXISTS idx_programs_source
  ON programs(source);

CREATE TABLE IF NOT EXISTS filler_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS filler_programs (
  filler_id TEXT NOT NULL
    REFERENCES filler_lists(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  source TEXT NOT NULL CHECK (source IN ('plex', 'custom-file')),
  source_ref TEXT NOT NULL CHECK (json_valid(source_ref)),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  PRIMARY KEY (filler_id, position)
);

CREATE INDEX IF NOT EXISTS idx_filler_programs_filler
  ON filler_programs(filler_id, position);

CREATE TABLE IF NOT EXISTS custom_shows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS custom_show_programs (
  show_id TEXT NOT NULL
    REFERENCES custom_shows(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  source TEXT NOT NULL CHECK (source = 'plex'),
  source_ref TEXT NOT NULL CHECK (json_valid(source_ref)),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  PRIMARY KEY (show_id, position)
);

CREATE INDEX IF NOT EXISTS idx_custom_show_programs_show
  ON custom_show_programs(show_id, position);

CREATE TABLE IF NOT EXISTS plex_servers (
  name TEXT PRIMARY KEY CHECK (length(trim(name)) BETWEEN 1 AND 200),
  uri TEXT NOT NULL CHECK (uri LIKE 'http://%' OR uri LIKE 'https://%'),
  client_identifier TEXT,
  access_token_encrypted BLOB NOT NULL CHECK (length(access_token_encrypted) > 0),
  access_token_iv BLOB NOT NULL CHECK (length(access_token_iv) = 12),
  access_token_tag BLOB NOT NULL CHECK (length(access_token_tag) = 16),
  ar_guide INTEGER NOT NULL DEFAULT 0 CHECK (ar_guide IN (0, 1)),
  ar_channels INTEGER NOT NULL DEFAULT 0 CHECK (ar_channels IN (0, 1)),
  sort_index INTEGER NOT NULL DEFAULT 0 CHECK (sort_index >= 0),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_plex_servers_sort
  ON plex_servers(sort_index, name);

CREATE TABLE IF NOT EXISTS settings (
  -- Known singleton names: ffmpeg, plex, xmltv, hdhr. Phase 4 may add identity
  -- fields such as the rotated Plex client identifier in the plex value blob.
  name TEXT PRIMARY KEY CHECK (name IN ('ffmpeg', 'plex', 'xmltv', 'hdhr')),
  value TEXT NOT NULL CHECK (json_valid(value)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS play_times (
  -- Mirrors legacy play-cache/<channel>/<base64(programKey)>.json without
  -- requiring every transient program key to have a programs.id row.
  channel_number INTEGER NOT NULL
    REFERENCES channels(number)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  program_key TEXT NOT NULL,
  last_played_at_ms INTEGER NOT NULL CHECK (last_played_at_ms >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (channel_number, program_key)
);

CREATE INDEX IF NOT EXISTS idx_play_times_channel
  ON play_times(channel_number, updated_at);

CREATE TABLE IF NOT EXISTS cache_images (
  -- Legacy cache-images.url is a base64-encoded source URL. The Phase 3
  -- migration should decode it into source_url while preserving cache_key.
  cache_key TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  mime_type TEXT,
  local_path TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata)),
  fetched_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cache_images_source_url
  ON cache_images(source_url);

CREATE TRIGGER IF NOT EXISTS trg_channels_updated_at
AFTER UPDATE ON channels
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE channels
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE number = NEW.number;
END;

CREATE TRIGGER IF NOT EXISTS trg_programs_updated_at
AFTER UPDATE ON programs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE programs
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_filler_lists_updated_at
AFTER UPDATE ON filler_lists
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE filler_lists
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_custom_shows_updated_at
AFTER UPDATE ON custom_shows
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE custom_shows
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_plex_servers_updated_at
AFTER UPDATE ON plex_servers
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE plex_servers
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE name = NEW.name;
END;

CREATE TRIGGER IF NOT EXISTS trg_settings_updated_at
AFTER UPDATE ON settings
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE settings
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE name = NEW.name;
END;

CREATE TRIGGER IF NOT EXISTS trg_play_times_updated_at
AFTER UPDATE ON play_times
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE play_times
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE channel_number = NEW.channel_number
    AND program_key = NEW.program_key;
END;

CREATE TRIGGER IF NOT EXISTS trg_cache_images_updated_at
AFTER UPDATE ON cache_images
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE cache_images
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE cache_key = NEW.cache_key;
END;

COMMIT;

-- Sign-off: Codex (OpenAI), Lane Delta · 2026-05-05
