const os = require('os');

let warnedAboutLocalhostFallback = false;
const LOOPBACK_BASE_URL_RE =
  /\bhttps?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?/gi;

type RequestLike = {
  protocol?: string;
  get?: (name: string) => string | undefined;
};

function getInternalBaseUrl(req?: RequestLike): string {
  if (process.env.INTERNAL_URL) {
    return trimTrailingSlash(process.env.INTERNAL_URL);
  }

  if (req && typeof req.get === 'function') {
    const host = req.get('host');

    if (req.protocol && host) {
      return `${req.protocol}://${host}`;
    }
  }

  if (shouldWarnAboutLocalhostFallback() && !warnedAboutLocalhostFallback) {
    warnedAboutLocalhostFallback = true;
    console.warn(
      'INTERNAL_URL is not set and no request host is available; falling back to localhost.'
    );
  }

  return `http://localhost:${process.env.PORT || 8000}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function replaceLoopbackBaseUrls(
  value: unknown,
  replacementBaseUrl: string
): string {
  const baseUrl = trimTrailingSlash(replacementBaseUrl);
  return String(value).replace(LOOPBACK_BASE_URL_RE, baseUrl);
}

function getProviderBaseUrl(req?: RequestLike): string {
  const baseUrl = getInternalBaseUrl(req);
  if (!isLoopbackBaseUrl(baseUrl)) {
    return baseUrl;
  }

  const networkBaseUrls = getLocalNetworkBaseUrls(req);
  return networkBaseUrls[0] || baseUrl;
}

function getLocalNetworkBaseUrls(req?: RequestLike): string[] {
  const port = getPort(req);
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(
      (
        address: unknown
      ): address is { family: string; internal: boolean; address: string } =>
        Boolean(address) &&
        typeof address === 'object' &&
        (address as { family?: string }).family === 'IPv4'
    )
    .filter((address) => !address.internal)
    .map((address) => `http://${address.address}:${port}`);
}

function isLoopbackBaseUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '::1' ||
      hostname.startsWith('127.')
    );
  } catch (_err) {
    return false;
  }
}

function getPort(req?: RequestLike): string {
  const baseUrl = getInternalBaseUrl(req);
  try {
    const parsed = new URL(baseUrl);
    return parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch (_err) {
    return process.env.PORT || '8000';
  }
}

function shouldWarnAboutLocalhostFallback(): boolean {
  return process.env.NODE_ENV !== 'production';
}

module.exports = {
  getInternalBaseUrl,
  getLocalNetworkBaseUrls,
  getProviderBaseUrl,
  replaceLoopbackBaseUrls,
};
