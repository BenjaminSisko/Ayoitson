const {
  decryptToken,
  encryptToken,
  readOrCreateMasterKey,
} = require('../lib/crypto');
const { jsonParse, jsonStringify } = require('../storage/sqlite');

class PlexServerDAO {
  constructor(db, options = {}) {
    this.db = db;
    this.masterKey = options.masterKey || readOrCreateMasterKey(options);
  }

  listPublic() {
    return this.rows().map((row) => toPublicServer(row));
  }

  listDecrypted() {
    return this.rows().map((row) => this.toDecryptedServer(row));
  }

  getDecrypted(name) {
    const row = this.db
      .prepare('SELECT * FROM plex_servers WHERE name = ?')
      .get(name);
    return row ? this.toDecryptedServer(row) : null;
  }

  exists(name) {
    const row = this.db
      .prepare('SELECT 1 AS found FROM plex_servers WHERE name = ?')
      .get(name);
    return Boolean(row);
  }

  save(server) {
    const encrypted = encryptToken(
      String(server.accessToken || ''),
      this.masterKey
    );
    const metadata = {
      index: server.index ?? 0,
      ...server.metadata,
    };

    this.db
      .prepare(
        `INSERT INTO plex_servers
          (name, uri, client_identifier, access_token_encrypted,
           access_token_iv, access_token_tag, arGuide, arChannels, metadata)
         VALUES
          (@name, @uri, @clientIdentifier, @ciphertext,
           @iv, @tag, @arGuide, @arChannels, @metadata)
         ON CONFLICT(name) DO UPDATE SET
           uri = excluded.uri,
           client_identifier = excluded.client_identifier,
           access_token_encrypted = excluded.access_token_encrypted,
           access_token_iv = excluded.access_token_iv,
           access_token_tag = excluded.access_token_tag,
           arGuide = excluded.arGuide,
           arChannels = excluded.arChannels,
           metadata = excluded.metadata`
      )
      .run({
        name: server.name || 'plex',
        uri: server.uri,
        clientIdentifier: server.clientIdentifier || server.client_identifier,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        arGuide: server.arGuide ? 1 : 0,
        arChannels: server.arChannels ? 1 : 0,
        metadata: jsonStringify(metadata),
      });
  }

  delete(name) {
    this.db.prepare('DELETE FROM plex_servers WHERE name = ?').run(name);
  }

  rows() {
    return this.db.prepare('SELECT * FROM plex_servers ORDER BY name').all();
  }

  toDecryptedServer(row) {
    return {
      ...toPublicServer(row),
      accessToken: decryptToken(
        row.access_token_encrypted,
        row.access_token_iv,
        row.access_token_tag,
        this.masterKey
      ),
    };
  }
}

function toPublicServer(row) {
  const metadata = jsonParse(row.metadata);
  return {
    name: row.name,
    uri: row.uri,
    clientIdentifier: row.client_identifier || undefined,
    arGuide: Boolean(row.arGuide),
    arChannels: Boolean(row.arChannels),
    index: metadata.index ?? 0,
    metadata,
  };
}

module.exports = PlexServerDAO;
