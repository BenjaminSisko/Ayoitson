// @ts-nocheck
const { v4: uuidv4 } = require('uuid');
const { jsonParse, jsonStringify } = require('../storage/sqlite');

class CustomShowDAO {
  constructor(db) {
    this.db = db;
  }

  async getShow(id) {
    const row = this.db
      .prepare('SELECT metadata FROM custom_shows WHERE id = ?')
      .get(id);
    return row ? { ...jsonParse(row.metadata), id } : null;
  }

  async saveShow(id, json) {
    if (!id) {
      throw new Error('Missing custom show id');
    }

    const show = fixup({ ...json, id });
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO custom_shows (id, name, metadata)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             metadata = excluded.metadata`
        )
        .run(id, show.name, jsonStringify(show));
      this.db
        .prepare('DELETE FROM custom_show_programs WHERE show_id = ?')
        .run(id);

      const insertProgram = this.db.prepare(
        `INSERT INTO custom_show_programs
          (show_id, position, duration_ms, source, source_ref, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      show.content.forEach((program, index) => {
        insertProgram.run(
          id,
          index,
          Number(program.duration || 0),
          program.source || 'plex',
          jsonStringify(program),
          jsonStringify(program)
        );
      });
    });

    tx();
  }

  async createShow(json) {
    const id = uuidv4();
    await this.saveShow(id, json);
    return id;
  }

  async deleteShow(id) {
    this.db.prepare('DELETE FROM custom_shows WHERE id = ?').run(id);
  }

  async getAllShowIds() {
    return this.db
      .prepare('SELECT id FROM custom_shows ORDER BY name, id')
      .all()
      .map((row) => row.id);
  }

  async getAllShows() {
    return this.db
      .prepare('SELECT id, metadata FROM custom_shows ORDER BY name, id')
      .all()
      .map((row) => ({ ...jsonParse(row.metadata), id: row.id }));
  }

  async getAllShowsInfo() {
    const shows = await this.getAllShows();
    return shows.map((show) => ({
      id: show.id,
      name: show.name,
      count: show.content.length,
    }));
  }
}

function fixup(json) {
  if (!Array.isArray(json.content)) {
    json.content = [];
  }
  if (typeof json.name === 'undefined') {
    json.name = 'Unnamed Show';
  }
  return json;
}

module.exports = CustomShowDAO;
