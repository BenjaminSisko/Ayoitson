const fs = require('fs');
const path = require('path');

const migrationSourcePath = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'database-migration.js'
);
const plexServerDbSourcePath = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'dao',
  'plex-server-db.js'
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collection(initialRows = []) {
  const rows = initialRows.map(clone);

  return {
    rows,
    find: () => rows.map(clone),
    save: (value) => {
      if (Array.isArray(value)) {
        rows.push(...value.map(clone));
        return;
      }

      rows.push(clone(value));
    },
    remove: (query) => {
      if (!query || Object.keys(query).length === 0) {
        rows.splice(0);
        return;
      }

      for (let i = rows.length - 1; i >= 0; i--) {
        const matches = Object.entries(query).every(
          ([key, expected]) => rows[i][key] === expected
        );
        if (matches) {
          rows.splice(i, 1);
        }
      }
    },
  };
}

describe('Delta database migration cleanup', () => {
  test('does not print Plex access tokens while splitting embedded servers', () => {
    const { __test } = require('../../src/database-migration');
    const token = 'PLEX_TOKEN_SHOULD_NOT_LOG';
    const uri = 'http://plex.internal:32400';
    const logMessages = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((message) => {
      logMessages.push(String(message));
    });

    try {
      const db = {
        'plex-servers': collection([
          {
            _id: 'legacy-plex',
            name: 'Primary Plex',
            uri,
            accessToken: token,
            arGuide: false,
            arChannels: false,
          },
        ]),
        channels: collection([
          {
            number: 1,
            name: 'Movies',
            programs: [
              {
                title: 'Feature',
                duration: 3000,
                server: {
                  uri: `${uri}/`,
                  accessToken: token,
                },
                actualDuration: 3000,
                commercials: [],
              },
            ],
            fallback: [],
            fillerContent: [],
          },
        ]),
      };
      const savedChannels = [];
      const channelDB = {
        saveChannelSync: (number, channel) => {
          savedChannels.push({ number, channel });
        },
      };

      __test.splitServersSingleChannels(db, channelDB);

      const joinedLogs = logMessages.join('\n');
      expect(joinedLogs).not.toContain(token);
      expect(joinedLogs).not.toContain('accessToken=');
      expect(joinedLogs).not.toContain(`${uri}|${token}`);
      expect(savedChannels).toHaveLength(1);
      expect(savedChannels[0].channel.programs[0]).toMatchObject({
        title: 'Feature',
        duration: 3000,
        serverKey: 'Primary Plex',
      });
      expect(savedChannels[0].channel.programs[0].server).toBeUndefined();
      expect(
        savedChannels[0].channel.programs[0].actualDuration
      ).toBeUndefined();
      expect(savedChannels[0].channel.programs[0].commercials).toBeUndefined();
    } finally {
      logSpy.mockRestore();
    }
  });

  test('uses the shared internal URL helper for remaining offline image fallbacks', () => {
    const migrationSource = fs.readFileSync(migrationSourcePath, 'utf8');
    const plexServerDbSource = fs.readFileSync(plexServerDbSourcePath, 'utf8');

    expect(migrationSource).toContain("require('./lib/url')");
    expect(plexServerDbSource).toContain("require('../lib/url')");
    expect(migrationSource).toContain(
      '${getInternalBaseUrl()}/images/generic-offline-screen.png'
    );
    expect(plexServerDbSource).toContain(
      '${getInternalBaseUrl()}/images/generic-offline-screen.png'
    );
    expect(migrationSource).not.toContain('http://localhost');
    expect(plexServerDbSource).not.toContain('http://localhost');
    expect(migrationSource).not.toContain('localhost:${process.env.PORT}');
    expect(plexServerDbSource).not.toContain('localhost:${process.env.PORT}');
  });

  test('drops legacy pseudotv-to-dizquetv recovery branches', () => {
    const migrationSource = fs.readFileSync(migrationSourcePath, 'utf8');

    expect(migrationSource).not.toContain('appNameChange');
    expect(migrationSource).not.toContain('attemptMigratePlexFrom51');
    expect(migrationSource).not.toContain('migrateChannelsFrom51');
    expect(migrationSource).not.toMatch(/replace\([^)]*\.pseudotv/);
    expect(migrationSource).toContain(
      'legacy pseudotv-plex server/channel recovery was removed'
    );
  });
});
