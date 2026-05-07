const dns = require('dns').promises;
const net = require('net');

const DEFAULT_TIMEOUT_MS = 5000;
const BLOCKED_SCHEMES = new Set([
  'concat:',
  'data:',
  'file:',
  'pipe:',
  'subfile:',
]);

class WatermarkValidationError extends Error {
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'WatermarkValidationError';
    this.details = details;
  }
}

async function validateWatermarkUrl(
  input: unknown,
  options: Record<string, any> = {}
): Promise<string> {
  const raw = String(input ?? '').trim();
  const schemeName = raw
    .match(/^([A-Za-z][A-Za-z0-9+.-]*):/)?.[1]
    ?.toLowerCase();
  if (schemeName && BLOCKED_SCHEMES.has(`${schemeName}:`)) {
    throw new WatermarkValidationError(
      `Blocked watermark URL scheme: ${schemeName}:`
    );
  }

  let url;
  try {
    url = new URL(raw);
  } catch (err) {
    throw new WatermarkValidationError('Watermark URL must be absolute', {
      cause: err,
    });
  }

  if (url.protocol !== 'https:') {
    throw new WatermarkValidationError('Watermark URL must use HTTPS');
  }

  await rejectPrivateHost(url, options);

  if (options.skipReachability !== true) {
    await assertReachable(url, options);
  }

  return url.toString();
}

async function validateWatermark(
  watermark: { url?: unknown } | null | undefined,
  options: Record<string, any> = {}
): Promise<string | null> {
  if (!watermark || !watermark.url) {
    return null;
  }

  return validateWatermarkUrl(watermark.url, options);
}

async function rejectPrivateHost(
  url: URL,
  options: Record<string, any> = {}
): Promise<void> {
  const addresses = await resolveHost(url.hostname, options);
  for (const address of addresses) {
    if (isPrivateAddress(address.address)) {
      throw new WatermarkValidationError(
        `Watermark URL resolves to private address ${address.address}`,
        { address: address.address, hostname: url.hostname }
      );
    }
  }
}

async function resolveHost(
  hostname: string,
  options: Record<string, any> = {}
): Promise<Array<{ address: string; family: number }>> {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(normalizedHostname)) {
    return [
      { address: normalizedHostname, family: net.isIP(normalizedHostname) },
    ];
  }

  const resolve =
    options.resolveHost || ((host: string) => dns.lookup(host, { all: true }));
  const addresses = await resolve(normalizedHostname);
  const normalized = Array.isArray(addresses) ? addresses : [addresses];

  return normalized.map((entry: any) => {
    if (typeof entry === 'string') {
      return { address: entry, family: net.isIP(entry) };
    }
    return entry;
  });
}

async function assertReachable(
  url: URL,
  options: Record<string, any> = {}
): Promise<void> {
  const fetchImpl = options.fetchImpl || global.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new WatermarkValidationError(
      'Watermark reachability check requires fetch'
    );
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Watermark URL timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const response = await fetchImpl(url.toString(), {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });

    if (response.status >= 400) {
      throw new WatermarkValidationError(
        `Watermark URL returned status ${response.status}`
      );
    }
  } catch (err) {
    if (err instanceof WatermarkValidationError) {
      throw err;
    }
    throw new WatermarkValidationError('Watermark URL is not reachable', {
      cause: err,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isPrivateAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) {
    const parts = address.split('.').map((part) => Number(part));
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    const c = parts[2] ?? 0;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  if (family === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('ff')
    );
  }

  return true;
}

module.exports = {
  WatermarkValidationError,
  isPrivateAddress,
  validateWatermark,
  validateWatermarkUrl,
};
