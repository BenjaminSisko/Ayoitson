// @ts-nocheck
const fs = require('fs');
const http = require('http');
const https = require('https');

function createAyoitsonServer(app, options = {}) {
  const env = options.env || process.env;
  const certPath = env.HTTPS_CERT;
  const keyPath = env.HTTPS_KEY;

  if (Boolean(certPath) !== Boolean(keyPath)) {
    throw new Error('HTTPS_CERT and HTTPS_KEY must be set together.');
  }

  if (certPath && keyPath) {
    return {
      protocol: 'https',
      server: https.createServer(
        {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        },
        app
      ),
    };
  }

  return {
    protocol: 'http',
    server: http.createServer(app),
  };
}

module.exports = {
  createAyoitsonServer,
};
