'use strict';

const { spawn } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

function run(label, args) {
  const child = spawn(npmCommand, args, {
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}.`);
      process.exitCode = code;
    } else if (signal) {
      console.error(`${label} exited from ${signal}.`);
      process.exitCode = 1;
    }
    shutdown(signal || 'SIGTERM');
  });

  children.push(child);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal === 'SIGINT' ? 'SIGINT' : 'SIGTERM');
    }
  }

  setTimeout(() => process.exit(process.exitCode || 0), 250).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

run('Express dev server', ['run', 'dev-server']);
run('Vite dev server', ['run', 'dev-web']);
