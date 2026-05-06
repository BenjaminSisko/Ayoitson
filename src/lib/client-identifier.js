const { v4: uuidv4 } = require('uuid');
const constants = require('../constants');

let processClientIdentifier = null;

function createClientIdentifier(platform = process.platform) {
  return (
    uuidv4().replace(/-/g, '').slice(0, 16) +
    constants.PLEX_CLIENT_IDENTIFIER_SUFFIX +
    platform
  );
}

function getOrCreateClientIdentifier(db) {
  const collection = db && db['client-id'];

  if (!collection || typeof collection.find !== 'function') {
    return getProcessClientIdentifier();
  }

  const existing = collection.find()[0];
  if (existing && existing.clientId) {
    return existing.clientId;
  }

  const clientId = createClientIdentifier();
  if (typeof collection.save === 'function') {
    collection.save({ clientId });
  }
  return clientId;
}

function getProcessClientIdentifier() {
  if (!processClientIdentifier) {
    processClientIdentifier = createClientIdentifier();
  }
  return processClientIdentifier;
}

module.exports = {
  createClientIdentifier,
  getOrCreateClientIdentifier,
  getProcessClientIdentifier,
};
