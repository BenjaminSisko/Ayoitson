const {
  createSsdpServer,
  parseSsdpHeaders,
} = require('../../src/lib/ssdp-server');

describe('minimal SSDP server', () => {
  test('parses SSDP headers case-insensitively', () => {
    expect(
      parseSsdpHeaders('M-SEARCH * HTTP/1.1\r\nST: ssdp:all\r\n\r\n')
    ).toEqual({ st: 'ssdp:all' });
  });

  test('matches explicit and wildcard search targets', () => {
    const server = createSsdpServer({
      udn: 'uuid:test',
      allowWildcards: true,
    });
    server.addUSN('upnp:rootdevice');

    expect(server.matchesSearchTarget('upnp:rootdevice')).toBe(true);
    expect(server.matchesSearchTarget('uuid:test')).toBe(true);
    expect(server.matchesSearchTarget('ssdp:all')).toBe(true);
    expect(server.matchesSearchTarget('urn:missing')).toBe(false);
  });

  test('resolves an HDHR device location URL', () => {
    const server = createSsdpServer({
      location: { port: '8000', path: '/device.xml' },
    });

    expect(server.resolveLocation('192.0.2.10')).toBe(
      'http://192.0.2.10:8000/device.xml'
    );
  });
});
