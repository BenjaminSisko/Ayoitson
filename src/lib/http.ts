import type { SafeFsPath } from './path-validator';

const dns = require('dns').promises as typeof import('dns').promises;
const fs = require('fs') as typeof import('fs');
const net = require('net') as typeof import('net');
const path = require('path') as typeof import('path');
const { validatePath } = require('./path-validator') as {
  validatePath(input: string, baseDir?: string): SafeFsPath;
};

const DEFAULT_TIMEOUT_MS = 30 * 1000;
const DEFAULT_MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
const REDACTED = '[redacted]';
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'x-api-key',
  'x-plex-token',
]);

class HttpRequestError extends Error {
  details: HttpErrorDetails;

  constructor(message: string, details: HttpErrorDetails = {}) {
    super(message);
    this.name = 'HttpRequestError';
    this.details = details;

    if (details.cause) {
      this.cause = details.cause;
    }
  }
}

type HeaderMap = Record<string, string>;
type HeaderInput = NonNullable<RequestInit['headers']> | HeaderMap;

type AddressRecord = {
  address: string;
  family: number;
};

type AllowlistEntry = {
  protocol?: string;
  hostname: string;
  port?: string;
  includeSubdomains?: boolean;
};

type HttpRequestOptions = {
  allowlist?: Array<string | URL | AllowlistEntry>;
  allowPrivateNetwork?: boolean;
  body?: RequestInit['body'];
  databaseDir?: string;
  fetchImpl?: typeof fetch;
  headers?: HeaderInput;
  json?: unknown;
  maxBytes?: number;
  method?: string;
  resolveHost?: (
    hostname: string
  ) => Promise<string | AddressRecord | Array<string | AddressRecord>>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

type HttpErrorDetails = Record<string, unknown> & {
  cause?: unknown;
};

type HttpResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  headers: HeaderMap;
  body: Buffer;
  text: string;
  data: unknown;
};

async function httpGet(
  url: string | URL,
  opts: HttpRequestOptions = {}
): Promise<HttpResponse> {
  return httpRequest('GET', url, opts);
}

async function httpPost(
  url: string | URL,
  opts: HttpRequestOptions = {}
): Promise<HttpResponse> {
  return httpRequest(opts.method || 'POST', url, opts);
}

async function httpRequest(
  method: string,
  url: string | URL,
  opts: HttpRequestOptions = {}
): Promise<HttpResponse> {
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
      const reason = controller.signal.reason as Error | undefined;
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

function buildFetchInit(
  method: string,
  opts: HttpRequestOptions,
  signal: AbortSignal
): RequestInit {
  const headers = normalizeHeaders(opts.headers);
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

function buildHttpResponse(response: Response, body: Buffer): HttpResponse {
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

async function validateOutboundUrl(
  url: string | URL,
  opts: HttpRequestOptions = {}
): Promise<void> {
  const parsed = parseHttpUrl(url);
  const hostname = normalizeHostname(parsed.hostname);
  const addresses = await resolveAddresses(hostname, opts);
  const isAllowlisted = isAllowedUrl(parsed, opts);

  for (const address of addresses) {
    if (isPrivateAddress(address.address) && !opts.allowPrivateNetwork) {
      throw new HttpRequestError(
        `Blocked outbound request to private address ${address.address}`,
        {
          host: hostname,
        }
      );
    }
  }

  if (!isAllowlisted) {
    throw new HttpRequestError(
      `Outbound URL is not allowlisted: ${parsed.origin}`,
      {
        origin: parsed.origin,
      }
    );
  }
}

async function rejectManualRedirect(
  response: Response,
  requestUrl: URL,
  opts: HttpRequestOptions
): Promise<void> {
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

async function readLimitedBody(
  response: Response,
  maxBytes: number,
  abortRequest: () => void
): Promise<Buffer> {
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
  const chunks: Buffer[] = [];
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

async function resolveAddresses(
  hostname: string,
  opts: HttpRequestOptions = {}
): Promise<AddressRecord[]> {
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

function isAllowedUrl(url: URL, opts: HttpRequestOptions = {}): boolean {
  const allowlist = buildAllowlist(opts);

  return allowlist.some((entry) => matchesAllowlistEntry(url, entry));
}

function buildAllowlist(opts: HttpRequestOptions = {}): AllowlistEntry[] {
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

  return entries.filter(Boolean) as AllowlistEntry[];
}

function readConfiguredPlexServerUris(
  databaseDir: string | undefined = process.env.AYOITSON_DATABASE ||
    process.env.DATABASE
): string[] {
  const baseDir = databaseDir || path.join(process.cwd(), '.ayoitson');
  const resolvedBaseDir = path.resolve(baseDir);
  const serverPath = validatePath(
    path.join(resolvedBaseDir, 'plex-servers.json'),
    resolvedBaseDir
  );

  return readConfiguredPlexServerUrisFile(serverPath);
}

function readConfiguredPlexServerUrisFile(serverPath: SafeFsPath): string[] {
  if (!fs.existsSync(serverPath)) {
    return [];
  }

  try {
    const servers = JSON.parse(fs.readFileSync(serverPath, 'utf8'));
    if (!Array.isArray(servers)) {
      return [];
    }

    return servers
      .map((server: { uri?: unknown } | null) => server && server.uri)
      .filter((uri: unknown): uri is string => typeof uri === 'string');
  } catch (err) {
    return [];
  }
}

function normalizeAllowlistEntry(
  entry: string | URL | AllowlistEntry | null | undefined
): AllowlistEntry | null {
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

function urlToAllowlistEntry(url: URL): AllowlistEntry {
  return {
    protocol: url.protocol,
    hostname: normalizeHostname(url.hostname),
    port: url.port,
  };
}

function matchesAllowlistEntry(url: URL, entry: AllowlistEntry): boolean {
  if (entry.protocol && url.protocol !== entry.protocol) {
    return false;
  }

  if (entry.port && url.port !== entry.port) {
    return false;
  }

  const hostname = normalizeHostname(url.hostname);
  return Boolean(
    hostname === entry.hostname ||
    (entry.includeSubdomains && hostname.endsWith(`.${entry.hostname}`))
  );
}

function normalizeHostname(hostname: string): string {
  const value = String(hostname).toLowerCase();

  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1);
  }

  return value;
}

function parseHttpUrl(url: string | URL): URL {
  const parsed = url instanceof URL ? url : new URL(url);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpRequestError(
      `Unsupported outbound protocol: ${parsed.protocol}`
    );
  }

  return parsed;
}

function isPrivateAddress(address: string): boolean {
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

function isPrivateMappedIpv4(address: string): boolean {
  const match = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const mappedAddress = match?.[1];
  return Boolean(mappedAddress && isPrivateIpv4(mappedAddress));
}

function isPrivateIpv4(address: string): boolean {
  const [a = NaN, b = NaN] = address.split('.').map((part) => Number(part));

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

function isPrivateIpv6(address: string): boolean {
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

function normalizeHeaders(headers: HeaderInput = {}): HeaderMap {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(
      headers.map(([name, value]) => [name, String(value)])
    );
  }

  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, String(value)])
  );
}

function redactHeaders(headers: HeaderInput = {}): HeaderMap {
  const entries = Object.entries(normalizeHeaders(headers));
  const redacted: HeaderMap = {};

  for (const [name, value] of entries) {
    redacted[name] = SENSITIVE_HEADERS.has(String(name).toLowerCase())
      ? REDACTED
      : String(value);
  }

  return redacted;
}

function hasHeader(headers: HeaderMap, target: string): boolean {
  return Object.keys(headers).some((name) => name.toLowerCase() === target);
}

function getFetch(opts: HttpRequestOptions = {}): typeof fetch {
  return opts.fetchImpl || fetch;
}

function linkAbortSignal(
  sourceSignal: AbortSignal | undefined,
  controller: AbortController
): () => void {
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

function attachRequestDetails(
  error: HttpRequestError,
  method: string,
  url: URL,
  opts: HttpRequestOptions = {}
): HttpRequestError {
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
