import { useAuthStore } from './auth-store';
import type { components } from './api-types';

export type ApiErrorBody = components['schemas']['Error'];
export type CreatedKey = components['schemas']['CreatedKey'];
export type PlexServerPublic = components['schemas']['PlexServerPublic'];
export type PlexServerCreate = components['schemas']['PlexServerCreate'];

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
  ffmpegPath?: string;
  maxFPS?: number;
  maxFrameBuffer?: number;
};

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
};
