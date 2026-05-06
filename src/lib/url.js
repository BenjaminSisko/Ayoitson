const os = require('os');

let warnedAboutLocalhostFallback = false;
const LOOPBACK_BASE_URL_RE =
  /\bhttps?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?/gi;

function getInternalBaseUrl(req) {
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

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function replaceLoopbackBaseUrls(value, replacementBaseUrl) {
  const baseUrl = trimTrailingSlash(replacementBaseUrl);
  return String(value).replace(LOOPBACK_BASE_URL_RE, baseUrl);
}

function getProviderBaseUrl(req) {
  const baseUrl = getInternalBaseUrl(req);
  if (!isLoopbackBaseUrl(baseUrl)) {
    return baseUrl;
  }

  const networkBaseUrls = getLocalNetworkBaseUrls(req);
  return networkBaseUrls[0] || baseUrl;
}

function getLocalNetworkBaseUrls(req) {
  const port = getPort(req);
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address && address.family === 'IPv4')
    .filter((address) => !address.internal)
    .map((address) => `http://${address.address}:${port}`);
}

function isLoopbackBaseUrl(value) {
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

function getPort(req) {
  const baseUrl = getInternalBaseUrl(req);
  try {
    const parsed = new URL(baseUrl);
    return parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch (_err) {
    return process.env.PORT || '8000';
  }
}

function shouldWarnAboutLocalhostFallback() {
  return process.env.NODE_ENV !== 'production';
}

module.exports = {
  getInternalBaseUrl,
  getLocalNetworkBaseUrls,
  getProviderBaseUrl,
  replaceLoopbackBaseUrls,
};
