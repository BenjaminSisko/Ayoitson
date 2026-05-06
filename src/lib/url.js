let warnedAboutLocalhostFallback = false;

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

  if (!warnedAboutLocalhostFallback) {
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

module.exports = {
  getInternalBaseUrl,
};
