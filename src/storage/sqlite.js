const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DATA_DIR = '.ayoitson';
const DEFAULT_DB_FILE = 'db.sqlite';
const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

function openAyoitsonDatabase(options = {}) {
  const dbPath = resolveDatabasePath(options);

  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath, {
    readonly: Boolean(options.readonly),
    fileMustExist: Boolean(options.fileMustExist),
  });

  db.pragma('foreign_keys = ON');

  if (options.migrate !== false && !options.readonly) {
    runMigrations(db, options.migrationsDir || DEFAULT_MIGRATIONS_DIR);
  }

  return db;
}

function resolveDatabasePath(options = {}) {
  if (options.memory) {
    return ':memory:';
  }

  if (options.databasePath) {
    return options.databasePath;
  }

  const databaseDir =
    options.databaseDir ||
    process.env.AYOITSON_DATABASE ||
    process.env.DATABASE ||
    DEFAULT_DATA_DIR;
  return path.join(databaseDir, DEFAULT_DB_FILE);
}

function runMigrations(db, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d+_.*\.sql$/.test(file))
    .sort();

  const applied = getAppliedVersions(db);

  for (const file of files) {
    const version = Number(file.split('_')[0]);
    if (applied.has(version)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
    ensureSchemaVersion(db, version);
  }
}

function getAppliedVersions(db) {
  const table = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'"
    )
    .get();

  if (!table) {
    return new Set();
  }

  return new Set(
    db
      .prepare('SELECT version FROM schema_version')
      .all()
      .map((row) => Number(row.version))
  );
}

function ensureSchemaVersion(db, version) {
  db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (?)').run(
    version
  );
}

function jsonStringify(value) {
  return JSON.stringify(value ?? {});
}

function jsonParse(value, fallback = {}) {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }

  return JSON.parse(value);
}

function transaction(db, fn) {
  return db.transaction(fn)();
}

async function backupDatabase(db, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  await db.backup(destination);
  return destination;
}

module.exports = {
  DEFAULT_DATA_DIR,
  DEFAULT_DB_FILE,
  DEFAULT_MIGRATIONS_DIR,
  openAyoitsonDatabase,
  resolveDatabasePath,
  runMigrations,
  jsonStringify,
  jsonParse,
  transaction,
  backupDatabase,
};
