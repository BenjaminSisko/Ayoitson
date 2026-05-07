#!/usr/bin/env tsx
'use strict';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
const { backupDatabase, openAyoitsonDatabase, resolveDatabasePath } =
  require('../src/storage/sqlite') as {
    backupDatabase(db: SqliteDatabase, destination: string): Promise<string>;
    openAyoitsonDatabase(options: {
      databaseDir?: string;
      fileMustExist?: boolean;
      migrate?: boolean;
      readonly?: boolean;
    }): SqliteDatabase;
    resolveDatabasePath(options: { databaseDir?: string }): string;
  };

type SqliteDatabase = {
  backup(destination: string): Promise<void>;
  close(): void;
};

type ParsedArgs = {
  output?: string;
};

function timestampForFilename(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }
    if ((arg === '--output' || arg === '-o') && argv[i + 1]) {
      parsed.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (!arg.startsWith('-') && !parsed.output) {
      parsed.output = arg;
    }
  }

  return parsed;
}

function resolveDatabaseDir(): string {
  return (
    process.env.AYOITSON_DATABASE ||
    process.env.DATABASE ||
    path.join(process.cwd(), '.ayoitson')
  );
}

function resolveDestination(options: {
  databaseDir: string;
  output?: string;
}): string {
  if (options.output) {
    return path.resolve(options.output);
  }

  return path.join(
    options.databaseDir,
    'backups',
    `ayoitson-${timestampForFilename()}.sqlite`
  );
}

async function createBackup(options: { output?: string } = {}) {
  const databaseDir = resolveDatabaseDir();
  const databasePath = resolveDatabasePath({ databaseDir });
  const destination = resolveDestination({
    databaseDir,
    output: options.output,
  });

  if (path.resolve(destination) === path.resolve(databasePath)) {
    throw new Error('Refusing to overwrite the live SQLite database');
  }

  const db = openAyoitsonDatabase({
    databaseDir,
    fileMustExist: true,
    migrate: false,
    readonly: true,
  });

  try {
    await backupDatabase(db, destination);
    fs.chmodSync(destination, 0o600);
    return { databasePath, destination };
  } finally {
    db.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await createBackup(args);
  process.stdout.write(`Ayoitson backup created: ${result.destination}\n`);
}

if (require.main === module) {
  main().catch((err: Error) => {
    process.stderr.write(`backup failed: ${err.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  createBackup,
  parseArgs,
  resolveDestination,
  timestampForFilename,
};
