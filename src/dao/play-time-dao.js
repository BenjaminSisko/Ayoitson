class PlayTimeDAO {
  constructor(db) {
    this.db = db;
  }

  async load() {
    return undefined;
  }

  getProgramLastPlayTime(channelId, programKey) {
    const row = this.db
      .prepare(
        'SELECT position_ms FROM play_times WHERE channel_id = ? AND program_key = ?'
      )
      .get(Number(channelId), String(programKey));
    return row ? row.position_ms : 0;
  }

  async update(channelId, programKey, t) {
    this.db
      .prepare(
        `INSERT INTO play_times
          (channel_id, program_key, position_ms, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(channel_id, program_key) DO UPDATE SET
           position_ms = excluded.position_ms,
           updated_at = datetime('now')`
      )
      .run(Number(channelId), String(programKey), Number(t));
  }
}

module.exports = PlayTimeDAO;
