#!/usr/bin/env node
// scripts/first-run.js
// Generates the master API key for a fresh Ayoitson install. The raw
// key is printed ONCE on stdout, the operator confirms they copied it,
// and only then is it persisted (argon2id-hashed) into the api_keys
// table. The raw key never appears again — losing it means revoking and
// minting a new one.
//
// Run via:
//   node scripts/first-run.js
//   AYOITSON_DATABASE=/path/to/.ayoitson node scripts/first-run.js
//
// See docs/runbooks/first-run.md for the operator-facing instructions.

'use strict';

const path = require('path');
const readline = require('readline');
const { openAyoitsonDatabase } = require('../src/storage/sqlite');
const { createKey, listKeys } = require('../src/lib/api-keys');

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function resolveDatabaseDir() {
  return (
    process.env.AYOITSON_DATABASE ||
    process.env.DATABASE ||
    path.join(process.cwd(), '.ayoitson')
  );
}

async function main() {
  const databaseDir = resolveDatabaseDir();
  process.stdout.write(`Using database directory: ${databaseDir}\n`);

  const db = openAyoitsonDatabase({ databaseDir });

  const existing = listKeys(db).filter((k) => !k.revokedAt);
  if (existing.length > 0 && process.env.AYOITSON_FIRST_RUN_FORCE !== '1') {
    process.stderr.write(
      'Refusing to mint a master key: active API keys already exist.\n' +
        'Set AYOITSON_FIRST_RUN_FORCE=1 if you really want to add another.\n'
    );
    db.close();
    process.exitCode = 1;
    return;
  }

  const name = (await prompt('Label for this master key [master]: ')).trim() || 'master';

  const { metadata, rawKey } = await createKey(db, name, ['*']);

  process.stdout.write('\n');
  process.stdout.write('================================================================\n');
  process.stdout.write('  Ayoitson master API key — copy this NOW. It will not be shown\n');
  process.stdout.write('  again. Losing it means revoking and minting a replacement.\n');
  process.stdout.write('----------------------------------------------------------------\n');
  process.stdout.write(`  ${rawKey}\n`);
  process.stdout.write('================================================================\n');
  process.stdout.write(
    `\nKey id: ${metadata.id}\nLabel:  ${metadata.name}\nScopes: ${metadata.scopes.join(', ') || '(none)'}\n\n`
  );

  const confirm = await prompt('Type "I have copied the key" to confirm: ');
  if (confirm.trim().toLowerCase() !== 'i have copied the key') {
    process.stderr.write(
      '\nConfirmation mismatch. The key has been persisted (hashed). If you did\n' +
        'not actually copy it, revoke it now and re-run this script.\n'
    );
    db.close();
    process.exitCode = 2;
    return;
  }

  process.stdout.write('Confirmed. The key is now active.\n');
  db.close();
}

main().catch((err) => {
  process.stderr.write(`first-run failed: ${err.message}\n`);
  process.exitCode = 1;
});
