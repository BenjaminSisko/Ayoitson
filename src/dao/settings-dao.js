const { jsonParse, jsonStringify } = require('../storage/sqlite');

class SettingsDAO {
  constructor(db) {
    this.db = db;
  }

  get(name, fallback = null) {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE name = ?')
      .get(name);
    return row ? jsonParse(row.value, fallback) : fallback;
  }

  set(name, value) {
    this.db
      .prepare(
        `INSERT INTO settings (name, value)
         VALUES (?, ?)
         ON CONFLICT(name) DO UPDATE SET value = excluded.value`
      )
      .run(name, jsonStringify(value));
  }

  all() {
    return this.db
      .prepare('SELECT name, value FROM settings ORDER BY name')
      .all()
      .map((row) => ({ name: row.name, value: jsonParse(row.value) }));
  }
}

module.exports = SettingsDAO;
