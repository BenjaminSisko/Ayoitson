const dns = require('dns').promises;
const fs = require('fs');
const net = require('net');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 30 * 1000;
const DEFAULT_MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
const REDACTED = '[redacted]';
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'x-api-key',
  'x-plex-token',
]);

class HttpRequestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'HttpRequestError';
    this.details = details;

    if (details.cause) {
      this.cause = details.cause;
    }
  }
}

async function httpGet(url, opts = {}) {
  return httpRequest('GET', url, opts);
}

async function httpPost(url, opts = {}) {
  return httpRequest(opts.method || 'POST', url, opts);
}

async function httpRequest(method, url, opts = {}) {
  const requestUrl = parseHttpUrl(url);
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => {
    controller.abort(new Error(`HTTP request timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  const removeAbortListener = linkAbortSignal(opts.signal, controller);

  try {
    await validateOutboundUrl(requestUrl, opts);

    const init = buildFetchInit(method, opts, controller.signal);
    const response = await getFetch(opts)(requestUrl.toString(), init);

    await validateOutboundUrl(requestUrl, opts);
    await rejectManualRedirect(response, requestUrl, opts);

    const body = await readLimitedBody(
      response,
      opts.maxBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      () => {
        controller.abort(
          new Error('HTTP response exceeded the configured size cap')
        );
      }
    );

    return buildHttpResponse(response, body);
  } catch (err) {
    if (err instanceof HttpRequestError) {
      throw attachRequestDetails(err, method, requestUrl, opts);
    }

    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      const message =
        reason && reason.message ? reason.message : 'HTTP request aborted';
      throw attachRequestDetails(
        new HttpRequestError(message, { cause: err }),
        method,
        requestUrl,
        opts
      );
    }

    throw attachRequestDetails(
      new HttpRequestError('HTTP request failed', { cause: err }),
      method,
      requestUrl,
      opts
    );
  } finally {
    clearTimeout(timeout);
    removeAbortListener();
  }
}

function buildFetchInit(method, opts, signal) {
  const headers = { ...(opts.headers || {}) };
  let body = opts.body;

  if (typeof opts.json !== 'undefined') {
    body = JSON.stringify(opts.json);
    if (!hasHeader(headers, 'content-type')) {
      headers['content-type'] = 'application/json';
    }
  }

  return {
    method,
    headers,
    body,
    redirect: 'manual',
    signal,
  };
}

function buildHttpResponse(response, body) {
  const headers = Object.fromEntries(response.headers.entries());
  const contentType = response.headers.get('content-type') || '';
  const text = body.toString('utf8');
  let data = text;

  if (
    contentType.toLowerCase().includes('application/json') &&
    text.length > 0
  ) {
    data = JSON.parse(text);
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    headers,
    body,
    text,
    data,
  };
}

async function validateOutboundUrl(url, opts = {}) {
  const parsed = parseHttpUrl(url);
  const hostname = normalizeHostname(parsed.hostname);
  const addresses = await resolveAddresses(hostname, opts);

  for (const address of addresses) {
    if (isPrivateAddress(address.address)) {
      throw new HttpRequestError(
        `Blocked outbound request to private address ${address.address}`,
        {
          host: hostname,
        }
      );
    }
  }

  if (!isAllowedUrl(parsed, opts)) {
    throw new HttpRequestError(
      `Outbound URL is not allowlisted: ${parsed.origin}`,
      {
        origin: parsed.origin,
      }
    );
  }
}

async function rejectManualRedirect(response, requestUrl, opts) {
  if (response.status < 300 || response.status >= 400) {
    return;
  }

  const location = response.headers.get('location');
  if (location) {
    const redirectUrl = parseHttpUrl(new URL(location, requestUrl));
    await validateOutboundUrl(redirectUrl, opts);
  }

  throw new HttpRequestError(
    'Outbound redirects are blocked by the HTTP wrapper',
    {
      status: response.status,
      location,
    }
  );
}

async function readLimitedBody(response, maxBytes, abortRequest) {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    abortRequest();
    throw new HttpRequestError(
      `HTTP response size ${contentLength} exceeds ${maxBytes} bytes`
    );
  }

  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = Buffer.from(value);
    total += chunk.length;
    if (total > maxBytes) {
      abortRequest();
      throw new HttpRequestError(
        `HTTP response size exceeds ${maxBytes} bytes`
      );
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks, total);
}

async function resolveAddresses(hostname, opts = {}) {
  if (net.isIP(hostname)) {
    return [{ address: hostname, family: net.isIP(hostname) }];
  }

  const resolveHost =
    opts.resolveHost || ((host) => dns.lookup(host, { all: true }));
  const addresses = await resolveHost(hostname);
  const normalized = Array.isArray(addresses) ? addresses : [addresses];

  return normalized.map((address) => {
    if (typeof address === 'string') {
      return { address, family: net.isIP(address) };
    }

    return address;
  });
}

function isAllowedUrl(url, opts = {}) {
  const allowlist = buildAllowlist(opts);

  return allowlist.some((entry) => matchesAllowlistEntry(url, entry));
}

function buildAllowlist(opts = {}) {
  const entries = [
    { hostname: 'plex.tv', includeSubdomains: true },
    ...readConfiguredPlexServerUris(opts.databaseDir).map((uri) =>
      normalizeAllowlistEntry(uri)
    ),
  ];

  if (Array.isArray(opts.allowlist)) {
    entries.push(
      ...opts.allowlist.map((entry) => normalizeAllowlistEntry(entry))
    );
  }

  return entries.filter(Boolean);
}

function readConfiguredPlexServerUris(
  databaseDir = process.env.AYOITSON_DATABASE || process.env.DATABASE
) {
  const baseDir = databaseDir || path.join(process.cwd(), '.ayoitson');
  const serverPath = path.join(baseDir, 'plex-servers.json');

  if (!fs.existsSync(serverPath)) {
    return [];
  }

  try {
    const servers = JSON.parse(fs.readFileSync(serverPath, 'utf8'));
    if (!Array.isArray(servers)) {
      return [];
    }

    return servers.map((server) => server && server.uri).filter(Boolean);
  } catch (err) {
    return [];
  }
}

function normalizeAllowlistEntry(entry) {
  if (!entry) {
    return null;
  }

  if (entry instanceof URL) {
    return urlToAllowlistEntry(entry);
  }

  if (typeof entry === 'object' && entry.hostname) {
    return {
      protocol: entry.protocol,
      hostname: normalizeHostname(entry.hostname),
      port: entry.port ? String(entry.port) : undefined,
      includeSubdomains: Boolean(entry.includeSubdomains),
    };
  }

  const value = String(entry);
  const url = new URL(value.includes('://') ? value : `https://${value}`);
  return urlToAllowlistEntry(url);
}

function urlToAllowlistEntry(url) {
  return {
    protocol: url.protocol,
    hostname: normalizeHostname(url.hostname),
    port: url.port,
  };
}

function matchesAllowlistEntry(url, entry) {
  if (entry.protocol && url.protocol !== entry.protocol) {
    return false;
  }

  if (entry.port && url.port !== entry.port) {
    return false;
  }

  const hostname = normalizeHostname(url.hostname);
  return (
    hostname === entry.hostname ||
    (entry.includeSubdomains && hostname.endsWith(`.${entry.hostname}`))
  );
}

function normalizeHostname(hostname) {
  const value = String(hostname).toLowerCase();

  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1);
  }

  return value;
}

function parseHttpUrl(url) {
  const parsed = url instanceof URL ? url : new URL(url);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpRequestError(
      `Unsupported outbound protocol: ${parsed.protocol}`
    );
  }

  return parsed;
}

function isPrivateAddress(address) {
  if (isPrivateMappedIpv4(address)) {
    return true;
  }

  const family = net.isIP(address);
  if (family === 4) {
    return isPrivateIpv4(address);
  }

  if (family === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

function isPrivateMappedIpv4(address) {
  const match = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return Boolean(match && isPrivateIpv4(match[1]));
}

function isPrivateIpv4(address) {
  const [a, b] = address.split('.').map((part) => Number(part));

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(address) {
  const value = address.toLowerCase();

  return (
    value === '::' ||
    value === '::1' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe8') ||
    value.startsWith('fe9') ||
    value.startsWith('fea') ||
    value.startsWith('feb')
  );
}

function redactHeaders(headers = {}) {
  const entries =
    typeof Headers !== 'undefined' && headers instanceof Headers
      ? headers.entries()
      : Object.entries(headers);
  const redacted = {};

  for (const [name, value] of entries) {
    redacted[name] = SENSITIVE_HEADERS.has(String(name).toLowerCase())
      ? REDACTED
      : value;
  }

  return redacted;
}

function hasHeader(headers, target) {
  return Object.keys(headers).some((name) => name.toLowerCase() === target);
}

function getFetch(opts = {}) {
  return opts.fetchImpl || fetch;
}

function linkAbortSignal(sourceSignal, controller) {
  if (!sourceSignal) {
    return () => undefined;
  }

  const abort = () => controller.abort(sourceSignal.reason);

  if (sourceSignal.aborted) {
    abort();
    return () => undefined;
  }

  sourceSignal.addEventListener('abort', abort, { once: true });
  return () => sourceSignal.removeEventListener('abort', abort);
}

function attachRequestDetails(error, method, url, opts = {}) {
  error.details = {
    ...error.details,
    request: {
      method,
      origin: url.origin,
      headers: redactHeaders(opts.headers),
    },
  };

  return error;
}

module.exports = {
  httpGet,
  httpPost,
  HttpRequestError,
  __test: {
    buildAllowlist,
    isPrivateAddress,
    redactHeaders,
    validateOutboundUrl,
  },
};
