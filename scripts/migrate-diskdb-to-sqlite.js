#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ChannelDAO = require('../src/dao/channel-dao');
const CustomShowDAO = require('../src/dao/custom-show-dao');
const FillerDAO = require('../src/dao/filler-dao');
const PlexServerDAO = require('../src/dao/plex-server-dao');
const SettingsDAO = require('../src/dao/settings-dao');
const { readOrCreateMasterKey } = require('../src/lib/crypto');
const {
  jsonStringify,
  openAyoitsonDatabase,
  transaction,
} = require('../src/storage/sqlite');

const SETTINGS_FILES = [
  'ffmpeg-settings',
  'plex-settings',
  'xmltv-settings',
  'hdhr-settings',
  'db-version',
  'client-id',
  'settings',
];

function migrateDiskdbToSqlite(options = {}) {
  const sourceDir = options.sourceDir || path.join(process.cwd(), '.dizquetv');
  const targetDir = options.targetDir || path.join(process.cwd(), '.ayoitson');
  const db =
    options.db ||
    openAyoitsonDatabase({
      databaseDir: targetDir,
      migrate: true,
    });
  const ownsDb = !options.db;
  const masterKey = options.masterKey || readOrCreateMasterKey(options);

  try {
    if (isMigrationComplete(db)) {
      return {
        skipped: true,
        reason: 'SQLite migration already completed',
        counts: readCounts(db),
      };
    }

    const fixture = readDiskdb(sourceDir);
    const counts = transaction(db, () => {
      clearTables(db);
      insertChannels(db, fixture.channels);
      insertFillers(db, fixture.fillers);
      insertCustomShows(db, fixture.customShows);
      insertPlexServers(db, fixture.plexServers, masterKey);
      insertSettings(db, fixture.settings);
      insertPlayTimes(db, fixture.playTimes);
      insertCacheImages(db, fixture.cacheImages);
      markMigrationComplete(db, sourceDir);
      return readCounts(db);
    });

    let legacyArchivePath = null;
    if (options.archiveLegacy) {
      legacyArchivePath = archiveLegacyFolder(sourceDir, options.now);
    }

    return {
      skipped: false,
      sourceDir,
      targetDir,
      legacyArchivePath,
      counts,
      warning: legacyArchivePath
        ? `${legacyArchivePath} contains plaintext Plex tokens. Verify the SQLite database, then delete the legacy folder.`
        : `${sourceDir} still contains plaintext Plex tokens. Archive/delete it only after verifying the SQLite database.`,
    };
  } finally {
    if (ownsDb) {
      db.close();
    }
  }
}

function readDiskdb(sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source .dizquetv folder not found: ${sourceDir}`);
  }

  return {
    channels: readEntityDirectory(path.join(sourceDir, 'channels')),
    fillers: readEntityDirectory(path.join(sourceDir, 'filler')),
    customShows: readEntityDirectory(path.join(sourceDir, 'custom-shows')),
    plexServers: readJsonFile(path.join(sourceDir, 'plex-servers.json'), []),
    settings: readSettings(sourceDir),
    playTimes: readPlayTimes(path.join(sourceDir, 'play-cache')),
    cacheImages: readJsonFile(path.join(sourceDir, 'cache-images.json'), []),
  };
}

function readEntityDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const id = path.basename(file, '.json');
      const value = readJsonFile(path.join(dir, file), {});
      return { id, value };
    });
}

function readSettings(sourceDir) {
  const settings = {};
  for (const name of SETTINGS_FILES) {
    const filePath = path.join(sourceDir, `${name}.json`);
    if (fs.existsSync(filePath)) {
      settings[name] = readJsonFile(filePath, {});
    }
  }
  return settings;
}

function readPlayTimes(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const rows = [];
  for (const channelId of fs.readdirSync(dir).sort()) {
    const channelDir = path.join(dir, channelId);
    if (!fs.statSync(channelDir).isDirectory()) {
      continue;
    }

    for (const file of fs.readdirSync(channelDir).sort()) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const programKey = Buffer.from(
        path.basename(file, '.json'),
        'base64'
      ).toString('utf8');
      const value = readJsonFile(path.join(channelDir, file), {});
      rows.push({
        channelId: Number(channelId),
        programKey,
        positionMs: Number(value.t || 0),
      });
    }
  }
  return rows;
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clearTables(db) {
  [
    'cache_images',
    'play_times',
    'custom_show_programs',
    'custom_shows',
    'filler_programs',
    'filler_lists',
    'programs',
    'channels',
    'plex_servers',
    'settings',
  ].forEach((table) => db.prepare(`DELETE FROM ${table}`).run());
}

function insertChannels(db, channels) {
  const dao = new ChannelDAO(db);
  for (const channel of channels) {
    dao.saveChannelSync(Number(channel.id), channel.value);
  }
}

function insertFillers(db, fillers) {
  const dao = new FillerDAO(db);
  for (const filler of fillers) {
    dao.saveFiller(filler.id, filler.value);
  }
}

function insertCustomShows(db, customShows) {
  const dao = new CustomShowDAO(db);
  for (const show of customShows) {
    dao.saveShow(show.id, show.value);
  }
}

function insertPlexServers(db, plexServers, masterKey) {
  const dao = new PlexServerDAO(db, { masterKey });
  for (const server of plexServers) {
    dao.save(server);
  }
}

function insertSettings(db, settings) {
  const dao = new SettingsDAO(db);
  for (const [name, value] of Object.entries(settings)) {
    dao.set(name, value);
  }
}

function insertPlayTimes(db, playTimes) {
  const statement = db.prepare(
    `INSERT INTO play_times (channel_id, program_key, position_ms)
     VALUES (?, ?, ?)`
  );
  for (const row of playTimes) {
    statement.run(row.channelId, row.programKey, row.positionMs);
  }
}

function insertCacheImages(db, cacheImages) {
  const statement = db.prepare(
    `INSERT INTO cache_images (hash, source_url, local_path, mime_type)
     VALUES (?, ?, ?, ?)`
  );
  for (const image of cacheImages) {
    const hash = image.hash || image.url;
    statement.run(
      hash,
      image.sourceUrl || image.source_url || image.url,
      image.localPath || image.local_path || image.url,
      image.mimeType || image.mime_type || null
    );
  }
}

function markMigrationComplete(db, sourceDir) {
  db.prepare(
    `INSERT INTO settings (name, value)
     VALUES ('_migration', ?)
     ON CONFLICT(name) DO UPDATE SET value = excluded.value`
  ).run(
    jsonStringify({
      sourceDir,
      migratedAt: new Date().toISOString(),
      version: 1,
    })
  );
}

function isMigrationComplete(db) {
  const row = db
    .prepare("SELECT value FROM settings WHERE name = '_migration'")
    .get();
  return Boolean(row);
}

function readCounts(db) {
  const count = (table) =>
    db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  return {
    channels: count('channels'),
    programs: count('programs'),
    fillerLists: count('filler_lists'),
    fillerPrograms: count('filler_programs'),
    customShows: count('custom_shows'),
    customShowPrograms: count('custom_show_programs'),
    plexServers: count('plex_servers'),
    settings: count('settings'),
    playTimes: count('play_times'),
    cacheImages: count('cache_images'),
  };
}

function archiveLegacyFolder(sourceDir, now = new Date()) {
  const parent = path.dirname(sourceDir);
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const archivePath = path.join(parent, `.dizquetv-legacy-${stamp}`);
  fs.renameSync(sourceDir, archivePath);
  return archivePath;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source') {
      args.sourceDir = argv[++i];
    } else if (arg === '--target') {
      args.targetDir = argv[++i];
    } else if (arg === '--archive-legacy') {
      args.archiveLegacy = true;
    }
  }
  return args;
}

async function main() {
  const result = await migrateDiskdbToSqlite(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
  if (result.warning) {
    console.warn(result.warning);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}

module.exports = {
  migrateDiskdbToSqlite,
  readDiskdb,
  readCounts,
  archiveLegacyFolder,
};
