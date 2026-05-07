const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
const Database = require('better-sqlite3');

const DEFAULT_DATA_DIR = '.ayoitson';
const DEFAULT_DB_FILE = 'db.sqlite';
const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

type SqliteDatabase = {
  backup(destination: string): Promise<void>;
  close(): void;
  exec(sql: string): void;
  pragma(sql: string): unknown;
  prepare(sql: string): {
    all(...params: unknown[]): Array<Record<string, unknown>>;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    run(...params: unknown[]): unknown;
  };
  transaction<T>(fn: () => T): () => T;
};

type OpenDatabaseOptions = {
  databaseDir?: string;
  databasePath?: string;
  fileMustExist?: boolean;
  memory?: boolean;
  migrate?: boolean;
  migrationsDir?: string;
  readonly?: boolean;
};

function openAyoitsonDatabase(
  options: OpenDatabaseOptions = {}
): SqliteDatabase {
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

function resolveDatabasePath(options: OpenDatabaseOptions = {}): string {
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

function runMigrations(
  db: SqliteDatabase,
  migrationsDir = DEFAULT_MIGRATIONS_DIR
): void {
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

function getAppliedVersions(db: SqliteDatabase): Set<number> {
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

function ensureSchemaVersion(db: SqliteDatabase, version: number): void {
  db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (?)').run(
    version
  );
}

function jsonStringify(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function jsonParse<T = unknown>(value: unknown, fallback = {} as T): T {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

function transaction<T>(db: SqliteDatabase, fn: () => T): T {
  return db.transaction(fn)();
}

async function backupDatabase(
  db: SqliteDatabase,
  destination: string
): Promise<string> {
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
