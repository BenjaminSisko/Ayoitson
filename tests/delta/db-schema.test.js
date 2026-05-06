const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', '..', 'db-schema.sql');

function readSchema() {
  return fs.readFileSync(schemaPath, 'utf8');
}

describe('Delta SQLite schema draft', () => {
  test('declares the Phase 3 core data tables', () => {
    const schema = readSchema();
    const expectedTables = [
      'schema_version',
      'channels',
      'programs',
      'filler_lists',
      'filler_programs',
      'custom_shows',
      'custom_show_programs',
      'plex_servers',
      'settings',
      'play_times',
      'cache_images',
    ];

    for (const table of expectedTables) {
      expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  test('keeps Plex tokens encrypted at rest', () => {
    const schema = readSchema();

    expect(schema).toContain('access_token_encrypted BLOB NOT NULL');
    expect(schema).toContain('access_token_iv BLOB NOT NULL');
    expect(schema).toContain('access_token_tag BLOB NOT NULL');
    expect(schema).not.toMatch(/access_token\s+TEXT/i);
  });

  test('documents foreign-key and index posture', () => {
    const schema = readSchema();

    expect(schema).toContain('PRAGMA foreign_keys = ON');
    expect(schema).toContain('REFERENCES channels(number)');
    expect(schema).toContain('REFERENCES filler_lists(id)');
    expect(schema).toContain('REFERENCES custom_shows(id)');
    expect(schema).toContain('idx_programs_channel_position');
    expect(schema).toContain('idx_cache_images_source_url');
  });
});
