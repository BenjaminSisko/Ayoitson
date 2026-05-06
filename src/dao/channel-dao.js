const { jsonParse, jsonStringify } = require('../storage/sqlite');

class ChannelDAO {
  constructor(db) {
    this.db = db;
  }

  async getChannel(number) {
    const row = this.db
      .prepare('SELECT metadata FROM channels WHERE number = ?')
      .get(Number(number));
    return row ? jsonParse(row.metadata, null) : null;
  }

  async saveChannel(number, json) {
    this.saveChannelSync(number, json);
  }

  saveChannelSync(number, json) {
    const channel = validateChannelJson(number, { ...json });
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO channels (number, name, group_title, metadata, updated_at)
           VALUES (@number, @name, @groupTitle, @metadata, datetime('now'))
           ON CONFLICT(number) DO UPDATE SET
             name = excluded.name,
             group_title = excluded.group_title,
             metadata = excluded.metadata,
             updated_at = datetime('now')`
        )
        .run({
          number: channel.number,
          name: channel.name || `Channel ${channel.number}`,
          groupTitle:
            channel.groupTitle || channel.groupTitle === ''
              ? channel.groupTitle
              : channel.group_title,
          metadata: jsonStringify(channel),
        });

      this.db
        .prepare('DELETE FROM programs WHERE channel_id = ?')
        .run(channel.number);

      const insertProgram = this.db.prepare(
        `INSERT INTO programs
          (channel_id, position, duration_ms, source, source_ref, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      (channel.programs || []).forEach((program, index) => {
        insertProgram.run(
          channel.number,
          index,
          Number(program.duration || program.duration_ms || 0),
          inferProgramSource(program),
          jsonStringify(program),
          jsonStringify(program)
        );
      });
    });

    tx();
  }

  async deleteChannel(number) {
    this.db
      .prepare('DELETE FROM channels WHERE number = ?')
      .run(Number(number));
  }

  async getAllChannelNumbers() {
    return this.db
      .prepare('SELECT number FROM channels ORDER BY number')
      .all()
      .map((row) => row.number);
  }

  async getAllChannels() {
    return this.db
      .prepare('SELECT metadata FROM channels ORDER BY number')
      .all()
      .map((row) => jsonParse(row.metadata));
  }
}

function validateChannelJson(number, json) {
  json.number = Number(number ?? json.number);
  if (!Number.isInteger(json.number)) {
    throw new Error('channel.number must be an integer');
  }
  return json;
}

function inferProgramSource(program = {}) {
  if (program.isOffline || program.type === 'offline') {
    return 'flex';
  }

  if (program.serverKey || program.ratingKey || program.key) {
    return 'plex';
  }

  if (program.redirect) {
    return 'redirect';
  }

  return program.source || 'plex';
}

module.exports = ChannelDAO;
