const { v4: uuidv4 } = require('uuid');
const { jsonParse, jsonStringify } = require('../storage/sqlite');

class FillerDAO {
  constructor(db, channelService) {
    this.db = db;
    this.channelService = channelService;
  }

  async getFiller(id) {
    const row = this.db
      .prepare('SELECT metadata FROM filler_lists WHERE id = ?')
      .get(id);
    return row ? { ...jsonParse(row.metadata), id } : null;
  }

  async saveFiller(id, json) {
    if (!id) {
      throw new Error('Missing filler id');
    }

    const filler = fixup({ ...json, id });
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO filler_lists (id, name, metadata)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             metadata = excluded.metadata`
        )
        .run(id, filler.name, jsonStringify(filler));
      this.db
        .prepare('DELETE FROM filler_programs WHERE filler_id = ?')
        .run(id);

      const insertProgram = this.db.prepare(
        `INSERT INTO filler_programs
          (filler_id, position, duration_ms, source, source_ref, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      filler.content.forEach((program, index) => {
        insertProgram.run(
          id,
          index,
          Number(program.duration || 0),
          program.source || (program.serverKey ? 'plex' : 'custom-file'),
          jsonStringify(program),
          jsonStringify(program)
        );
      });
    });

    tx();
  }

  async createFiller(json) {
    const id = uuidv4();
    await this.saveFiller(id, json);
    return id;
  }

  async deleteFiller(id) {
    this.db.prepare('DELETE FROM filler_lists WHERE id = ?').run(id);
  }

  async getAllFillerIds() {
    return this.db
      .prepare('SELECT id FROM filler_lists ORDER BY name, id')
      .all()
      .map((row) => row.id);
  }

  async getAllFillers() {
    return this.db
      .prepare('SELECT id, metadata FROM filler_lists ORDER BY name, id')
      .all()
      .map((row) => ({ ...jsonParse(row.metadata), id: row.id }));
  }

  async getAllFillersInfo() {
    const fillers = await this.getAllFillers();
    return fillers.map((filler) => ({
      id: filler.id,
      name: filler.name,
      count: filler.content.length,
    }));
  }
}

function fixup(json) {
  if (!Array.isArray(json.content)) {
    json.content = [];
  }
  if (typeof json.name === 'undefined') {
    json.name = 'Unnamed Filler';
  }
  return json;
}

module.exports = FillerDAO;
