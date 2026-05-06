const SettingsDAO = require('../dao/settings-dao');
const { openAyoitsonDatabase } = require('../storage/sqlite');
const { v4: uuidv4 } = require('uuid');

function createPlexClientIdentifier() {
  return `${uuidv4().replace(/-/g, '').slice(0, 16)}-org-ayoitson-${
    process.platform
  }`;
}

function readOrCreatePlexClientIdentifier(options = {}) {
  if (options.clientIdentifier) {
    return options.clientIdentifier;
  }

  if (options.settingsCollection) {
    return readOrCreateFromCollection(options.settingsCollection);
  }

  const databaseDir =
    options.databaseDir ||
    process.env.AYOITSON_DATABASE ||
    process.env.DATABASE;
  if (!databaseDir) {
    return createPlexClientIdentifier();
  }

  const db =
    options.sqlite ||
    openAyoitsonDatabase({
      databaseDir,
      migrate: true,
    });
  const ownsDb = !options.sqlite;

  try {
    const settings = new SettingsDAO(db);
    const value = settings.get('client-id', []);
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    const existing = rows.find((row) => row && row.clientId);
    if (existing) {
      return existing.clientId;
    }

    const created = { clientId: createPlexClientIdentifier() };
    settings.set('client-id', [created]);
    return created.clientId;
  } finally {
    if (ownsDb) {
      db.close();
    }
  }
}

function readOrCreateFromCollection(collection) {
  const rows = collection.find();
  const existing = rows.find((row) => row && row.clientId);
  if (existing) {
    return existing.clientId;
  }

  const created = { clientId: createPlexClientIdentifier() };
  collection.save(created);
  return created.clientId;
}

module.exports = {
  createPlexClientIdentifier,
  readOrCreatePlexClientIdentifier,
};
