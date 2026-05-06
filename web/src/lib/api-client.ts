import { useAuthStore } from './auth-store';
import type { components } from './api-types';

export type ApiErrorBody = components['schemas']['Error'];
export type CreatedKey = components['schemas']['CreatedKey'];
export type PlexServerPublic = components['schemas']['PlexServerPublic'];
export type PlexServerCreate = components['schemas']['PlexServerCreate'];
export type ChannelSummary = components['schemas']['ChannelSummary'];
export type Channel = components['schemas']['Channel'];
export type ChannelCreate = components['schemas']['Channel'];
export type XmltvSettings = components['schemas']['XmltvSettings'];

export type ApiKeyMetadata = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ApiKeyCreateResponse = {
  metadata: ApiKeyMetadata;
  rawKey: string;
};

export type FfmpegSettings = Record<string, unknown> & {
  _id?: string;
  configVersion?: number;
  ffmpegPath?: string;
  addLock?: boolean;
  lock?: boolean;
  threads?: number;
  concatMuxDelay?: string;
  logFfmpeg?: boolean;
  enableFFMPEGTranscoding?: boolean;
  audioVolumePercent?: number;
  videoEncoder?: string;
  audioEncoder?: string;
  targetResolution?: string;
  videoBitrate?: number;
  videoBufSize?: number;
  audioBitrate?: number;
  audioBufSize?: number;
  audioSampleRate?: number;
  audioChannels?: number;
  errorScreen?: string;
  errorAudio?: string;
  normalizeVideoCodec?: boolean;
  normalizeAudioCodec?: boolean;
  normalizeResolution?: boolean;
  normalizeAudio?: boolean;
  maxFPS?: number;
  scalingAlgorithm?: string;
  deinterlaceFilter?: string;
  disableChannelOverlay?: boolean;
  disablePreludes?: boolean;
  maxFrameBuffer?: number;
};

export type HdhrSettings = Record<string, unknown> & {
  tunerCount?: number;
  autoDiscoveryEnabled?: boolean;
};

export type GuideLineup = Record<string, unknown>;
type ChannelSummaryResponse = Array<ChannelSummary | number | string>;

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
};

export class ApiClientError extends Error {
  status: number;
  code: ApiErrorBody['code'] | 'UNKNOWN';
  details?: ApiErrorBody['details'];

  constructor(status: number, body?: Partial<ApiErrorBody>) {
    super(body?.message || `Request failed with status ${status}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body?.code || 'UNKNOWN';
    this.details = body?.details;
  }
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  const apiKey = useAuthStore.getState().apiKey;

  if (apiKey) {
    headers.set('X-API-Key', apiKey);
  }

  if (typeof options.body !== 'undefined' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body:
      typeof options.body === 'undefined'
        ? undefined
        : JSON.stringify(options.body),
  });

  const parsed = await parseResponse(response);
  if (!response.ok) {
    throw new ApiClientError(response.status, parsed as Partial<ApiErrorBody>);
  }

  return parsed as T;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { code: 'UNKNOWN', message: text };
  }
}

function normalizeChannelSummary(channel: ChannelSummary | number | string) {
  if (typeof channel === 'number') {
    return { number: channel };
  }

  if (typeof channel === 'string') {
    const parsed = Number(channel);
    return Number.isFinite(parsed) ? { number: parsed } : null;
  }

  if (typeof channel.number === 'number') {
    return channel;
  }

  return null;
}

export const apiClient = {
  setupInitialKey(name: string) {
    return request<CreatedKey>('/api/auth/setup', {
      method: 'POST',
      body: { name },
    });
  },

  listApiKeys() {
    return request<ApiKeyMetadata[]>('/api/api-keys');
  },

  createApiKey(name: string) {
    return request<ApiKeyCreateResponse>('/api/api-keys', {
      method: 'POST',
      body: { name },
    });
  },

  revokeApiKey(id: string) {
    return request<{ revoked: boolean }>(
      '/api/api-keys/' + encodeURIComponent(id),
      {
        method: 'DELETE',
      }
    );
  },

  listPlexServers() {
    return request<PlexServerPublic[]>('/api/plex-servers');
  },

  createPlexServer(server: PlexServerCreate) {
    return request<{ created?: boolean; name?: string }>('/api/plex-servers', {
      method: 'POST',
      body: server,
    });
  },

  deletePlexServer(name: string) {
    return request<{ deleted?: boolean; name?: string }>(
      '/api/plex-servers/' + encodeURIComponent(name),
      { method: 'DELETE' }
    );
  },

  getFfmpegSettings() {
    return request<FfmpegSettings>('/api/settings/ffmpeg');
  },

  updateFfmpegSettings(settings: FfmpegSettings) {
    return request<FfmpegSettings>('/api/settings/ffmpeg', {
      method: 'PUT',
      body: settings,
    });
  },

  resetFfmpegSettings() {
    return request<FfmpegSettings>('/api/settings/ffmpeg/reset', {
      method: 'POST',
    });
  },

  getXmltvSettings() {
    return request<XmltvSettings>('/api/settings/xmltv');
  },

  updateXmltvSettings(settings: XmltvSettings) {
    return request<XmltvSettings>('/api/settings/xmltv', {
      method: 'PUT',
      body: settings,
    });
  },

  getHdhrSettings() {
    return request<HdhrSettings>('/api/settings/hdhr');
  },

  updateHdhrSettings(settings: HdhrSettings) {
    return request<HdhrSettings>('/api/settings/hdhr', {
      method: 'PUT',
      body: settings,
    });
  },

  listChannels() {
    return request<ChannelSummaryResponse>('/api/channels').then((channels) =>
      channels
        .map((channel) => normalizeChannelSummary(channel))
        .filter((channel): channel is ChannelSummary => Boolean(channel))
    );
  },

  createChannel(channel: ChannelCreate) {
    return request<{ number: number }>('/api/channels', {
      method: 'POST',
      body: channel,
    });
  },

  getChannel(number: number, options: { programless?: boolean } = {}) {
    const search = options.programless ? '?programless=true' : '';
    return request<Channel>(
      '/api/channels/' + encodeURIComponent(String(number)) + search
    );
  },

  deleteChannel(number: number) {
    return request<{ deleted?: boolean; number?: number }>(
      '/api/channels/' + encodeURIComponent(String(number)),
      { method: 'DELETE' }
    );
  },

  getGuideChannel(number: number, dateFrom: string, dateTo: string) {
    const query = new URLSearchParams({ dateFrom, dateTo });
    return request<GuideLineup>(
      '/api/guide/channels/' +
        encodeURIComponent(String(number)) +
        '?' +
        query.toString()
    );
  },
};
