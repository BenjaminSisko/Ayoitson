const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const databaseMigration = require('../database-migration');
const ChannelDAO = require('../dao/channel-dao');
const CustomShowDAO = require('../dao/custom-show-dao');
const FillerDAO = require('../dao/filler-dao');
const PlexServerDAO = require('../dao/plex-server-dao');
const SettingsDAO = require('../dao/settings-dao');
const {
  DEFAULT_DATA_DIR,
  jsonParse,
  jsonStringify,
  openAyoitsonDatabase,
} = require('./sqlite');
const {
  migrateDiskdbToSqlite,
} = require('../../scripts/migrate-diskdb-to-sqlite');

const LEGACY_DATA_DIR = '.dizquetv';
const CURRENT_DB_VERSION = 805;
const SETTINGS_COLLECTIONS = [
  'ffmpeg-settings',
  'plex-settings',
  'xmltv-settings',
  'hdhr-settings',
  'db-version',
  'client-id',
  'settings',
];
const RUNTIME_COLLECTIONS = [
  'channels',
  'plex-servers',
  ...SETTINGS_COLLECTIONS,
  'cache-images',
];

function createRuntimeDatabase(options = {}) {
  const { databaseDir, legacyDir } = resolveRuntimeDataDirs(options);
  copyLegacyRuntimeAssets({
    databaseDir,
    legacyDir,
  });

  const sqlite =
    options.db ||
    openAyoitsonDatabase({
      databaseDir,
      databasePath: options.databasePath,
      migrate: true,
    });
  const ownsDb = !options.db;

  if (options.autoMigrate !== false) {
    maybeMigrateFromDiskdb(sqlite, {
      databaseDir,
      legacyDir,
      masterKey: options.masterKey,
      archiveLegacy: options.archiveLegacy,
    });
  }

  const runtimeDb = createDiskdbCompatDatabase(sqlite, {
    masterKey: options.masterKey,
  });
  runtimeDb.path = databaseDir;
  runtimeDb._db.path = databaseDir;
  runtimeDb.legacyPath = legacyDir;
  runtimeDb.close = () => {
    if (ownsDb) {
      sqlite.close();
    }
  };

  ensureRuntimeDefaults(runtimeDb, {
    databaseDir,
    env: options.env || process.env,
  });

  return runtimeDb;
}

function resolveRuntimeDataDirs(options = {}) {
  return {
    databaseDir:
      options.databaseDir ||
      process.env.AYOITSON_DATABASE ||
      process.env.DATABASE ||
      DEFAULT_DATA_DIR,
    legacyDir:
      options.legacyDir ||
      process.env.DIZQUETV_LEGACY_DATABASE ||
      LEGACY_DATA_DIR,
  };
}

function createDiskdbCompatDatabase(sqlite, options = {}) {
  const settingsDao = new SettingsDAO(sqlite);
  const collections = {
    sqlite,
    _db: { path: options.databaseDir || DEFAULT_DATA_DIR },
    channels: new ChannelCollection(new ChannelDAO(sqlite)),
    'plex-servers': new PlexServersCollection(
      new PlexServerDAO(sqlite, { masterKey: options.masterKey })
    ),
    'cache-images': new CacheImagesCollection(sqlite),
  };

  for (const name of SETTINGS_COLLECTIONS) {
    collections[name] = new SettingsCollection(settingsDao, name);
  }

  collections.connect = () => collections;
  collections.loadCollections = () => collections;

  return collections;
}

function ensureRuntimeDefaults(runtimeDb, options = {}) {
  const databaseDir = options.databaseDir || DEFAULT_DATA_DIR;
  ensureSingleton(runtimeDb['ffmpeg-settings'], defaultFFmpegSettings(options));
  ensureSingleton(runtimeDb['plex-settings'], defaultPlexSettings());
  ensureSingleton(runtimeDb['xmltv-settings'], {
    cache: 12,
    refresh: 4,
    enableImageCache: false,
    file: path.join(databaseDir, 'xmltv.xml'),
  });
  ensureSingleton(runtimeDb['hdhr-settings'], {
    tunerCount: 2,
    autoDiscovery: true,
  });
  ensureSingleton(runtimeDb['db-version'], {
    version: CURRENT_DB_VERSION,
  });
  ensureSingleton(runtimeDb['client-id'], {
    clientId:
      uuidv4().replace(/-/g, '').slice(0, 16) +
      '-org-dizquetv-' +
      process.platform,
  });
}

function ensureSingleton(collection, value) {
  if (collection.find().length === 0) {
    collection.save(value);
  }
}

function maybeMigrateFromDiskdb(sqlite, options = {}) {
  if (
    !options.legacyDir ||
    !fs.existsSync(options.legacyDir) ||
    isMigrationComplete(sqlite) ||
    !isRuntimeDataEmpty(sqlite)
  ) {
    return null;
  }

  return migrateDiskdbToSqlite({
    sourceDir: options.legacyDir,
    targetDir: options.databaseDir,
    db: sqlite,
    masterKey: options.masterKey,
    archiveLegacy: options.archiveLegacy,
  });
}

function isMigrationComplete(sqlite) {
  const row = sqlite
    .prepare("SELECT value FROM settings WHERE name = '_migration'")
    .get();
  return Boolean(row);
}

function isRuntimeDataEmpty(sqlite) {
  const tables = [
    'channels',
    'filler_lists',
    'custom_shows',
    'plex_servers',
    'settings',
    'cache_images',
  ];
  return tables.every(
    (table) =>
      sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count === 0
  );
}

function copyLegacyRuntimeAssets(options = {}) {
  const databaseDir = options.databaseDir || DEFAULT_DATA_DIR;
  const legacyDir = options.legacyDir || LEGACY_DATA_DIR;

  fs.mkdirSync(databaseDir, { recursive: true });
  if (
    !legacyDir ||
    !fs.existsSync(legacyDir) ||
    path.resolve(legacyDir) === path.resolve(databaseDir)
  ) {
    return;
  }

  for (const entry of [
    'images',
    'cache',
    'custom.css',
    'font.ttf',
    'xmltv.xml',
    'fontawesome-free-5.15.4-web',
    'bootstrap-4.4.1-dist',
  ]) {
    const source = path.join(legacyDir, entry);
    const destination = path.join(databaseDir, entry);
    if (fs.existsSync(source) && !fs.existsSync(destination)) {
      fs.cpSync(source, destination, { recursive: true });
    }
  }
}

class SettingsCollection {
  constructor(settingsDao, name) {
    this.settingsDao = settingsDao;
    this.collectionName = name;
  }

  find(query) {
    return this.readRows().filter((row) => matchesQuery(row, query));
  }

  findOne(query) {
    return this.find(query)[0];
  }

  save(data) {
    if (Array.isArray(data)) {
      return data.map((row) => this.saveOne(row));
    }
    return this.saveOne(data);
  }

  update(query, data, options) {
    const rows = this.readRows();
    const matchingIndexes = findMatchingIndexes(rows, query);

    if (matchingIndexes.length === 0) {
      if (options && options.upsert) {
        this.save(data);
        return { updated: 0, inserted: 1 };
      }
      return { updated: 0, inserted: 0 };
    }

    const limit = options && options.multi ? matchingIndexes.length : 1;
    for (let i = 0; i < limit; i += 1) {
      const index = matchingIndexes[i];
      rows[index] = {
        ...rows[index],
        ...clone(data),
        _id: rows[index]._id,
      };
    }
    this.writeRows(rows);
    return { updated: limit, inserted: 0 };
  }

  remove(query, multi = true) {
    if (!query) {
      this.settingsDao.delete(this.collectionName);
      return true;
    }

    const rows = this.readRows();
    const filtered = removeMatchingRows(rows, query, multi);
    this.writeRows(filtered);
    return true;
  }

  count() {
    return this.readRows().length;
  }

  saveOne(row) {
    const rows = this.readRows();
    const value = clone(row);
    if (!value._id) {
      value._id = uuidv4().replace(/-/g, '');
    }
    rows.push(value);
    this.writeRows(rows);
    return clone(value);
  }

  readRows() {
    const value = this.settingsDao.get(this.collectionName, []);
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    let changed = false;
    const normalized = rows.map((row, index) => {
      const value = clone(row);
      if (!value._id) {
        value._id = `${this.collectionName}-${index}`;
        changed = true;
      }
      return value;
    });
    if (changed) {
      this.writeRows(normalized);
    }
    return normalized;
  }

  writeRows(rows) {
    this.settingsDao.set(this.collectionName, rows.map(clone));
  }
}

class ChannelCollection {
  constructor(channelDao) {
    this.channelDao = channelDao;
    this.collectionName = 'channels';
  }

  find(query) {
    return this.readRows().filter((row) => matchesQuery(row, query));
  }

  findOne(query) {
    return this.find(query)[0];
  }

  save(data) {
    if (Array.isArray(data)) {
      return data.map((row) => this.saveOne(row));
    }
    return this.saveOne(data);
  }

  update(query, data, options) {
    const rows = this.readRows();
    const matchingRows = rows.filter((row) => matchesQuery(row, query));
    if (matchingRows.length === 0) {
      if (options && options.upsert) {
        this.save(data);
        return { updated: 0, inserted: 1 };
      }
      return { updated: 0, inserted: 0 };
    }

    const limit = options && options.multi ? matchingRows.length : 1;
    for (let i = 0; i < limit; i += 1) {
      const merged = {
        ...matchingRows[i],
        ...clone(data),
        number: Number(data.number ?? matchingRows[i].number),
      };
      this.channelDao.saveChannelSync(merged.number, merged);
    }
    return { updated: limit, inserted: 0 };
  }

  remove(query, multi = true) {
    const rows = this.readRows();
    const toRemove = query
      ? rows.filter((row) => matchesQuery(row, query))
      : rows;
    const limit = multi ? toRemove.length : Math.min(toRemove.length, 1);
    for (let i = 0; i < limit; i += 1) {
      this.channelDao.db
        .prepare('DELETE FROM channels WHERE number = ?')
        .run(Number(toRemove[i].number));
    }
    return true;
  }

  count() {
    return this.readRows().length;
  }

  saveOne(row) {
    const value = clone(row);
    this.channelDao.saveChannelSync(Number(value.number), value);
    return { ...value, _id: String(value.number) };
  }

  readRows() {
    return this.channelDao.db
      .prepare('SELECT metadata FROM channels ORDER BY number')
      .all()
      .map((row) => {
        const channel = jsonParse(row.metadata);
        return {
          ...clone(channel),
          _id: String(channel.number),
        };
      });
  }
}

class PlexServersCollection {
  constructor(plexServerDao) {
    this.plexServerDao = plexServerDao;
    this.collectionName = 'plex-servers';
  }

  find(query) {
    return this.readRows().filter((row) => matchesQuery(row, query));
  }

  findOne(query) {
    return this.find(query)[0];
  }

  save(data) {
    if (Array.isArray(data)) {
      return data.map((row) => this.saveOne(row));
    }
    return this.saveOne(data);
  }

  update(query, data, options) {
    const matches = this.find(query);
    if (matches.length === 0) {
      if (options && options.upsert) {
        this.save(data);
        return { updated: 0, inserted: 1 };
      }
      return { updated: 0, inserted: 0 };
    }

    const limit = options && options.multi ? matches.length : 1;
    for (let i = 0; i < limit; i += 1) {
      const existing = matches[i];
      this.plexServerDao.save({
        ...existing,
        ...clone(data),
        name: data.name || existing.name,
      });
    }
    return { updated: limit, inserted: 0 };
  }

  remove(query, multi = true) {
    const matches = query ? this.find(query) : this.find();
    const limit = multi ? matches.length : Math.min(matches.length, 1);
    for (let i = 0; i < limit; i += 1) {
      this.plexServerDao.delete(matches[i].name);
    }
    return true;
  }

  count() {
    return this.readRows().length;
  }

  saveOne(row) {
    const value = clone(row);
    this.plexServerDao.save(value);
    return this.find({ name: value.name || 'plex' })[0];
  }

  readRows() {
    return this.plexServerDao.listDecrypted().map((server) => ({
      ...server,
      _id: server.name,
    }));
  }
}

class CacheImagesCollection {
  constructor(sqlite) {
    this.sqlite = sqlite;
    this.collectionName = 'cache-images';
  }

  find(query) {
    return this.readRows().filter((row) => matchesQuery(row, query));
  }

  findOne(query) {
    return this.find(query)[0];
  }

  save(data) {
    if (Array.isArray(data)) {
      return data.map((row) => this.saveOne(row));
    }
    return this.saveOne(data);
  }

  update(query, data, options) {
    const matches = this.find(query);
    if (matches.length === 0) {
      if (options && options.upsert) {
        this.save(data);
        return { updated: 0, inserted: 1 };
      }
      return { updated: 0, inserted: 0 };
    }

    const limit = options && options.multi ? matches.length : 1;
    for (let i = 0; i < limit; i += 1) {
      this.saveOne({
        ...matches[i],
        ...clone(data),
        url: data.url || matches[i].url,
      });
    }
    return { updated: limit, inserted: 0 };
  }

  remove(query, multi = true) {
    const matches = query ? this.find(query) : this.find();
    const limit = multi ? matches.length : Math.min(matches.length, 1);
    for (let i = 0; i < limit; i += 1) {
      this.sqlite
        .prepare('DELETE FROM cache_images WHERE hash = ?')
        .run(matches[i].url);
    }
    return true;
  }

  count() {
    return this.readRows().length;
  }

  saveOne(row) {
    const value = clone(row);
    const hash = value.url || value.hash || value._id || uuidv4();
    this.sqlite
      .prepare(
        `INSERT INTO cache_images (hash, source_url, local_path, mime_type)
         VALUES (@hash, @sourceUrl, @localPath, @mimeType)
         ON CONFLICT(hash) DO UPDATE SET
           source_url = excluded.source_url,
           local_path = excluded.local_path,
           mime_type = excluded.mime_type`
      )
      .run({
        hash,
        sourceUrl: value.sourceUrl || value.source_url || hash,
        localPath: value.localPath || value.local_path || hash,
        mimeType: value.mimeType || value.mime_type || null,
      });
    return this.find({ url: hash })[0];
  }

  readRows() {
    return this.sqlite
      .prepare(
        `SELECT hash, source_url, local_path, mime_type
         FROM cache_images
         ORDER BY hash`
      )
      .all()
      .map((row) => ({
        _id: row.hash,
        url: row.hash,
        hash: row.hash,
        sourceUrl: row.source_url,
        localPath: row.local_path,
        mimeType: row.mime_type,
      }));
  }
}

function defaultFFmpegSettings(options = {}) {
  const ffmpeg = databaseMigration.defaultFFMPEG();
  const detected = detectFFmpegPath(options.env || process.env);
  if (detected) {
    ffmpeg.ffmpegPath = detected;
  }
  return ffmpeg;
}

function defaultPlexSettings() {
  return {
    streamPath: 'plex',
    debugLogging: true,
    directStreamBitrate: '20000',
    transcodeBitrate: '2000',
    mediaBufferSize: 1000,
    transcodeMediaBufferSize: 20000,
    maxPlayableResolution: '1920x1080',
    maxTranscodeResolution: '1920x1080',
    videoCodecs: 'h264,hevc,mpeg2video,av1',
    audioCodecs: 'ac3',
    maxAudioChannels: '2',
    audioBoost: '100',
    enableSubtitles: false,
    subtitleSize: '100',
    updatePlayStatus: false,
    streamProtocol: 'http',
    forceDirectPlay: false,
    pathReplace: '',
    pathReplaceWith: '',
  };
}

function detectFFmpegPath(env = process.env) {
  const candidates = [
    env.FFMPEG_PATH,
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ].filter(Boolean);
  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch (err) {
      return false;
    }
  });
}

function findMatchingIndexes(rows, query) {
  const indexes = [];
  for (let i = 0; i < rows.length; i += 1) {
    if (matchesQuery(rows[i], query)) {
      indexes.push(i);
    }
  }
  return indexes;
}

function removeMatchingRows(rows, query, multi) {
  let removed = 0;
  return rows.filter((row) => {
    const match = matchesQuery(row, query);
    if (match && (multi || removed === 0)) {
      removed += 1;
      return false;
    }
    return true;
  });
}

function matchesQuery(row, query = {}) {
  if (!query || Object.keys(query).length === 0) {
    return true;
  }
  return Object.entries(query).every(([key, expected]) => row[key] === expected);
}

function clone(value) {
  return JSON.parse(jsonStringify(value));
}

module.exports = {
  CURRENT_DB_VERSION,
  LEGACY_DATA_DIR,
  RUNTIME_COLLECTIONS,
  CacheImagesCollection,
  ChannelCollection,
  PlexServersCollection,
  SettingsCollection,
  copyLegacyRuntimeAssets,
  createDiskdbCompatDatabase,
  createRuntimeDatabase,
  defaultFFmpegSettings,
  ensureRuntimeDefaults,
  resolveRuntimeDataDirs,
  __test: {
    detectFFmpegPath,
    isRuntimeDataEmpty,
    maybeMigrateFromDiskdb,
  },
};
