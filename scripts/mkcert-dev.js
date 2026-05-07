#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const certDir = path.join(process.cwd(), 'certs');
const certPath = path.join(certDir, 'localhost.pem');
const keyPath = path.join(certDir, 'localhost-key.pem');

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });
  if (result.error && result.error.code === 'ENOENT') {
    process.stderr.write(
      'mkcert was not found. Install it first, then rerun npm run tls:dev.\n'
    );
    process.exit(127);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

fs.mkdirSync(certDir, { recursive: true });
run('mkcert', ['-install']);
run('mkcert', [
  '-cert-file',
  certPath,
  '-key-file',
  keyPath,
  'localhost',
  '127.0.0.1',
  '::1',
]);

process.stdout.write('\nDevelopment certificate created.\n');
process.stdout.write(`HTTPS_CERT=${certPath}\n`);
process.stdout.write(`HTTPS_KEY=${keyPath}\n`);
process.stdout.write(
  '\nStart with: HTTPS_CERT="$HTTPS_CERT" HTTPS_KEY="$HTTPS_KEY" npm start\n'
);
