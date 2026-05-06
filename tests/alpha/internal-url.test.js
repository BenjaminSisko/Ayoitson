function loadUrlHelper() {
  delete require.cache[require.resolve('../../src/lib/url')];
  return require('../../src/lib/url');
}

describe('getInternalBaseUrl', () => {
  let previousInternalUrl;
  let previousNodeEnv;
  let previousPort;
  let previousWarn;
  let warnings;

  beforeEach(() => {
    previousInternalUrl = process.env.INTERNAL_URL;
    previousNodeEnv = process.env.NODE_ENV;
    previousPort = process.env.PORT;
    previousWarn = console.warn;
    warnings = [];

    delete process.env.INTERNAL_URL;
    delete process.env.NODE_ENV;
    delete process.env.PORT;

    console.warn = (message) => {
      warnings.push(message);
    };
  });

  afterEach(() => {
    if (typeof previousInternalUrl === 'undefined') {
      delete process.env.INTERNAL_URL;
    } else {
      process.env.INTERNAL_URL = previousInternalUrl;
    }

    if (typeof previousNodeEnv === 'undefined') {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (typeof previousPort === 'undefined') {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }

    console.warn = previousWarn;
    delete require.cache[require.resolve('../../src/lib/url')];
  });

  test('uses INTERNAL_URL before request context', () => {
    process.env.INTERNAL_URL = 'https://ayoitson.internal:9443/';

    const { getInternalBaseUrl } = loadUrlHelper();
    const req = {
      protocol: 'http',
      get: () => 'request-host.local:8000',
    };

    expect(getInternalBaseUrl(req)).toBe('https://ayoitson.internal:9443');
    expect(warnings).toEqual([]);
  });

  test('uses request protocol and host when INTERNAL_URL is unset', () => {
    const { getInternalBaseUrl } = loadUrlHelper();
    const req = {
      protocol: 'https',
      get: (header) => {
        if (header === 'host') {
          return 'lan-box.example:34400';
        }

        return undefined;
      },
    };

    expect(getInternalBaseUrl(req)).toBe('https://lan-box.example:34400');
    expect(warnings).toEqual([]);
  });

  test('falls back to localhost with configured port and warns once', () => {
    process.env.PORT = '8123';

    const { getInternalBaseUrl } = loadUrlHelper();

    expect(getInternalBaseUrl()).toBe('http://localhost:8123');
    expect(getInternalBaseUrl()).toBe('http://localhost:8123');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('falling back to localhost');
  });

  test('does not warn about the localhost fallback in production', () => {
    process.env.NODE_ENV = 'production';

    const { getInternalBaseUrl } = loadUrlHelper();

    expect(getInternalBaseUrl()).toBe('http://localhost:8000');
    expect(warnings).toEqual([]);
  });

  test('uses port 8000 for the localhost fallback when PORT is unset', () => {
    const { getInternalBaseUrl } = loadUrlHelper();

    expect(getInternalBaseUrl()).toBe('http://localhost:8000');
    expect(warnings).toHaveLength(1);
  });
});
