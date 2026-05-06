const Plex = require('../../src/plex');

const PUBLIC_ADDRESS = '93.184.216.34';

function resolvePublic() {
  return async () => [{ address: PUBLIC_ADDRESS, family: 4 }];
}

describe('Phase 2 Plex HTTP wrapper migration', () => {
  test('Plex Get uses the HTTP wrapper allowlist and token header', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ MediaContainer: { size: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const plex = new Plex({
      uri: 'http://plex.example:32400',
      accessToken: 'fixture-token',
      fetchImpl,
      resolveHost: resolvePublic(),
    });

    const container = await plex.Get('/library/sections');
    const [, init] = fetchImpl.mock.calls[0];

    expect(container).toEqual({ size: 1 });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://plex.example:32400/library/sections',
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
      })
    );
    expect(init.headers['X-Plex-Token']).toBe('fixture-token');
  });

  test('Plex requests allow operator-configured private server URIs', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ MediaContainer: { size: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const plex = new Plex({
      uri: 'http://10.0.0.1:32400',
      accessToken: 'fixture-token',
      fetchImpl,
    });

    const container = await plex.Get('/');

    expect(container).toEqual({ size: 1 });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://10.0.0.1:32400/',
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
      })
    );
  });

  test('Plex Put preserves method and query parameters through the wrapper', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response('', { status: 200 });
    });
    const plex = new Plex({
      uri: 'http://plex.example:32400',
      accessToken: 'fixture-token',
      fetchImpl,
      resolveHost: resolvePublic(),
    });

    await plex.Put('/media/grabbers/devices/tuner/channelmap', {
      channelsEnabled: '7',
      'channelMapping[7]': '7',
      'channelMappingByKey[7]': '7',
    });
    const [url, init] = fetchImpl.mock.calls[0];
    const parsedUrl = new URL(url);

    expect(init.method).toBe('PUT');
    expect(parsedUrl.pathname).toBe('/media/grabbers/devices/tuner/channelmap');
    expect(parsedUrl.searchParams.get('channelsEnabled')).toBe('7');
    expect(parsedUrl.searchParams.get('channelMapping[7]')).toBe('7');
    expect(parsedUrl.searchParams.get('channelMappingByKey[7]')).toBe('7');
  });

  test('Plex SignIn posts form data through the wrapper', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ user: { authToken: 'new-token' } }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    });
    const plex = new Plex({
      uri: 'http://plex.example:32400',
      fetchImpl,
      resolveHost: resolvePublic(),
    });

    const result = await plex.SignIn('operator', 'password');
    const [url, init] = fetchImpl.mock.calls[0];

    expect(result).toEqual({ accessToken: 'new-token' });
    expect(url).toBe('https://plex.tv/users/sign_in.json');
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe(
      'application/x-www-form-urlencoded'
    );
    expect(init.body).toContain('user%5Blogin%5D=operator');
    expect(init.body).toContain('user%5Bpassword%5D=password');
  });
});
