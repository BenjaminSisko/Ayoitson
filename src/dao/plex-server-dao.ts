import type {
  DecryptedToken,
  EncryptedToken,
  EncryptedTokenRecord,
} from '../lib/crypto';

const {
  asDecryptedToken,
  asEncryptedToken,
  decryptToken,
  encryptToken,
  readOrCreateMasterKey,
} = require('../lib/crypto') as {
  asDecryptedToken(value: string): DecryptedToken;
  asEncryptedToken(value: string): EncryptedToken;
  decryptToken(
    ciphertext: EncryptedToken | string | Buffer | Uint8Array,
    iv: string | Buffer | Uint8Array,
    tag: string | Buffer | Uint8Array,
    masterKey: Buffer
  ): DecryptedToken;
  encryptToken(plain: DecryptedToken, masterKey: Buffer): EncryptedTokenRecord;
  readOrCreateMasterKey(options?: Record<string, unknown>): Buffer;
};
const { jsonParse, jsonStringify } = require('../storage/sqlite') as {
  jsonParse<T>(value: unknown, fallback?: T): T;
  jsonStringify(value: unknown): string;
};

type SqliteDatabase = {
  prepare(sql: string): {
    all(...params: unknown[]): PlexServerRow[];
    get(...params: unknown[]): PlexServerRow | undefined;
    run(params?: Record<string, unknown> | unknown): unknown;
  };
};

type PlexServerRow = {
  name: string;
  uri: string;
  client_identifier?: string | null;
  access_token_encrypted: EncryptedToken | string | Buffer | Uint8Array;
  access_token_iv: string | Buffer | Uint8Array;
  access_token_tag: string | Buffer | Uint8Array;
  arGuide: number | boolean;
  arChannels: number | boolean;
  metadata: string | null;
};

type PlexServerInput = {
  name?: string;
  uri: string;
  clientIdentifier?: string;
  client_identifier?: string;
  accessToken?: string | DecryptedToken;
  arGuide?: boolean;
  arChannels?: boolean;
  index?: number;
  metadata?: Record<string, unknown>;
};

type PublicPlexServer = {
  name: string;
  uri: string;
  clientIdentifier?: string;
  arGuide: boolean;
  arChannels: boolean;
  index: number;
  metadata: Record<string, unknown>;
};

type StoredPlexServer = PublicPlexServer & {
  accessTokenEncrypted: EncryptedToken;
  accessTokenIv: string;
  accessTokenTag: string;
};

type OutboundPlexServer = PublicPlexServer & {
  accessToken: DecryptedToken;
};

class PlexServerDAO {
  db: SqliteDatabase;
  masterKey: Buffer;

  constructor(db: SqliteDatabase, options: Record<string, unknown> = {}) {
    this.db = db;
    this.masterKey = Buffer.isBuffer(options.masterKey)
      ? options.masterKey
      : readOrCreateMasterKey(options);
  }

  list(): StoredPlexServer[] {
    return this.rows().map((row) => toStoredServer(row));
  }

  find(name: string): StoredPlexServer | null {
    const row = this.db
      .prepare('SELECT * FROM plex_servers WHERE name = ?')
      .get(name);
    return row ? toStoredServer(row) : null;
  }

  listPublic(): PublicPlexServer[] {
    return this.rows().map((row) => toPublicServer(row));
  }

  decryptForOutbound(
    nameOrServer: string | StoredPlexServer
  ): OutboundPlexServer | null {
    const stored =
      typeof nameOrServer === 'string' ? this.find(nameOrServer) : nameOrServer;
    if (!stored) {
      return null;
    }
    return {
      ...toPublicServer(stored),
      accessToken: decryptToken(
        stored.accessTokenEncrypted,
        stored.accessTokenIv,
        stored.accessTokenTag,
        this.masterKey
      ),
    };
  }

  exists(name: string): boolean {
    const row = this.db
      .prepare('SELECT 1 AS found FROM plex_servers WHERE name = ?')
      .get(name);
    return Boolean(row);
  }

  save(server: PlexServerInput): void {
    const encrypted = encryptToken(
      asDecryptedToken(String(server.accessToken || '')),
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

  delete(name: string): void {
    this.db.prepare('DELETE FROM plex_servers WHERE name = ?').run(name);
  }

  rows(): PlexServerRow[] {
    return this.db.prepare('SELECT * FROM plex_servers ORDER BY name').all();
  }
}

function toPublicServer(
  row: PlexServerRow | StoredPlexServer
): PublicPlexServer {
  if ('accessTokenEncrypted' in row) {
    return {
      name: row.name,
      uri: row.uri,
      clientIdentifier: row.clientIdentifier,
      arGuide: row.arGuide,
      arChannels: row.arChannels,
      index: row.index,
      metadata: row.metadata,
    };
  }

  const metadata = jsonParse<Record<string, unknown>>(row.metadata || '{}');
  return {
    name: row.name,
    uri: row.uri,
    clientIdentifier: row.client_identifier || undefined,
    arGuide: Boolean(row.arGuide),
    arChannels: Boolean(row.arChannels),
    index: Number(metadata.index ?? 0),
    metadata,
  };
}

function toStoredServer(row: PlexServerRow): StoredPlexServer {
  return {
    ...toPublicServer(row),
    accessTokenEncrypted: asEncryptedToken(
      normalizeStoredToken(row.access_token_encrypted)
    ),
    accessTokenIv: normalizeStoredToken(row.access_token_iv),
    accessTokenTag: normalizeStoredToken(row.access_token_tag),
  };
}

function normalizeStoredToken(value: string | Buffer | Uint8Array): string {
  if (Buffer.isBuffer(value)) {
    return value.toString('base64url');
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString('base64url');
  }
  return value;
}

module.exports = PlexServerDAO;
