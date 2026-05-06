import type { Channel } from '@/lib/api-client';

export type AnyRecord = Record<string, unknown>;

export type ChannelProgram = AnyRecord & {
  title?: string;
  showTitle?: string;
  name?: string;
  type?: string;
  source?: string;
  duration?: number;
  duration_ms?: number;
  serverKey?: string;
  key?: string;
  ratingKey?: string;
  isOffline?: boolean;
  icon?: string;
};

export type FillerCollection = AnyRecord & {
  id: string;
  weight: number;
  cooldown: number;
};

export type ChannelWatermark = AnyRecord & {
  enabled: boolean;
  url: string;
  position: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
  width: number;
  horizontalMargin: number;
  verticalMargin: number;
  fixedSize: boolean;
  animated: boolean;
  duration: number;
};

export type ChannelTranscoding = AnyRecord & {
  targetResolution: string;
  videoBitrate?: number;
  videoBufSize?: number;
};

export type ChannelOnDemand = AnyRecord & {
  isOnDemand: boolean;
  modulo: number;
  paused?: boolean;
};

export type ChannelDraft = Channel & {
  number: number;
  name: string;
  groupTitle: string;
  icon: string;
  startTime: string;
  programs: ChannelProgram[];
  fallback: ChannelProgram[];
  fillerCollections: FillerCollection[];
  fillerRepeatCooldown: number;
  offlineMode: 'pic' | 'clip';
  watermark: ChannelWatermark;
  transcoding: ChannelTranscoding;
  onDemand: ChannelOnDemand;
  duration: number;
};

const DEFAULT_START_TIME = '2026-01-01T00:00:00.000Z';

export function defaultWatermark(): ChannelWatermark {
  return {
    enabled: false,
    url: '',
    position: 'bottom-right',
    width: 12,
    horizontalMargin: 2,
    verticalMargin: 2,
    fixedSize: false,
    animated: false,
    duration: 0,
  };
}

export function normalizeChannel(channel: Channel, fallbackNumber?: number) {
  const source = (channel || {}) as AnyRecord;
  const number =
    typeof source.number === 'number'
      ? source.number
      : Number(fallbackNumber ?? source.number ?? 0);
  const programs = Array.isArray(source.programs)
    ? (source.programs as ChannelProgram[])
    : [];
  const fallback = Array.isArray(source.fallback)
    ? (source.fallback as ChannelProgram[])
    : [];
  const watermark = {
    ...defaultWatermark(),
    ...asRecord(source.watermark),
  };
  const transcoding = {
    targetResolution: '',
    ...asRecord(source.transcoding),
  };
  const onDemand = {
    isOnDemand: false,
    modulo: 1,
    ...asRecord(source.onDemand),
  };

  return {
    ...source,
    number,
    name:
      typeof source.name === 'string' && source.name.trim()
        ? source.name
        : `Channel ${number}`,
    groupTitle:
      typeof source.groupTitle === 'string' && source.groupTitle.trim()
        ? source.groupTitle
        : 'Ayoitson',
    icon: typeof source.icon === 'string' ? source.icon : '',
    startTime:
      typeof source.startTime === 'string' && source.startTime
        ? source.startTime
        : DEFAULT_START_TIME,
    programs,
    fallback,
    fillerCollections: normalizeFillerCollections(source.fillerCollections),
    fillerRepeatCooldown:
      typeof source.fillerRepeatCooldown === 'number'
        ? source.fillerRepeatCooldown
        : 30 * 60 * 1000,
    offlineMode: source.offlineMode === 'clip' ? 'clip' : 'pic',
    watermark,
    transcoding,
    onDemand,
    duration: channelDuration(programs),
  } as ChannelDraft;
}

export function sanitizeChannelForSave(channel: ChannelDraft): Channel {
  const programs = channel.programs.map(cleanProgram);
  const fallback = channel.fallback.map(cleanProgram);
  const fillerCollections = channel.fillerCollections
    .filter((collection) => collection.id && collection.id !== 'none')
    .map((collection) => ({
      ...collection,
      weight: Number(collection.weight || 1),
      cooldown: Number(collection.cooldown || 0),
    }));

  return {
    ...channel,
    number: Number(channel.number),
    name: channel.name.trim() || `Channel ${channel.number}`,
    groupTitle: channel.groupTitle.trim() || 'Ayoitson',
    programs,
    fallback,
    fillerCollections,
    fillerRepeatCooldown: Number(channel.fillerRepeatCooldown || 0),
    duration: channelDuration(programs),
  };
}

export function validateChannel(channel: ChannelDraft) {
  const errors: string[] = [];
  if (!Number.isInteger(channel.number) || channel.number <= 0) {
    errors.push('Channel number must be a positive whole number.');
  }
  if (!channel.name.trim()) {
    errors.push('Channel name is required.');
  }
  if (channel.watermark.enabled) {
    const watermarkError = validateWatermark(channel.watermark);
    if (watermarkError) errors.push(watermarkError);
  }
  if (channel.offlineMode === 'clip' && channel.fallback.length === 0) {
    errors.push('Fallback clip mode requires one fallback program.');
  }
  return errors;
}

export function validateWatermark(watermark: ChannelWatermark) {
  if (!watermark.enabled) return null;
  if (watermark.url && !isValidWatermarkUrl(watermark.url)) {
    return 'Watermark URL must be HTTPS and cannot target localhost or private IP ranges.';
  }
  if (watermark.width <= 0 || watermark.width > 100) {
    return 'Watermark width must be between 0 and 100.';
  }
  if (watermark.horizontalMargin < 0 || watermark.horizontalMargin > 100) {
    return 'Watermark horizontal margin must be between 0 and 100.';
  }
  if (watermark.verticalMargin < 0 || watermark.verticalMargin > 100) {
    return 'Watermark vertical margin must be between 0 and 100.';
  }
  if (watermark.width + watermark.horizontalMargin > 100) {
    return 'Watermark width plus horizontal margin must not exceed 100.';
  }
  if (watermark.duration < 0) {
    return 'Watermark duration must be zero or higher.';
  }
  return null;
}

export function isValidWatermarkUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) return false;
    if (/^(10|127|0)\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function channelDuration(programs: ChannelProgram[]) {
  return programs.reduce(
    (total, program) => total + programDuration(program),
    0
  );
}

export function programDuration(program: ChannelProgram) {
  const duration = Number(program.duration ?? program.duration_ms ?? 0);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

export function programTitle(program: ChannelProgram) {
  return (
    program.title ||
    program.showTitle ||
    program.name ||
    String(program.key || program.ratingKey || 'Untitled program')
  );
}

export function programSource(program: ChannelProgram) {
  if (program.isOffline || program.type === 'offline') return 'Offline';
  if (program.serverKey) return 'Plex';
  if (program.type) return program.type;
  return String(program.source || 'Program');
}

export function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function createOfflineProgram(title: string, durationMinutes: number) {
  return {
    title: title.trim() || 'Offline block',
    duration: Math.max(1, Math.round(durationMinutes)) * 60 * 1000,
    isOffline: true,
    type: 'offline',
  } satisfies ChannelProgram;
}

function normalizeFillerCollections(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.id === 'string')
    .map((entry) => ({
      ...entry,
      id: String(entry.id),
      weight: Number(entry.weight || 1),
      cooldown: Number(entry.cooldown || 0),
    }));
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as AnyRecord) : {};
}

function cleanProgram(program: ChannelProgram) {
  const clean = { ...program };
  delete clean.$index;
  delete clean.start;
  delete clean.stop;
  delete clean.streams;
  delete clean.durationStr;
  delete clean.commercials;
  return clean;
}
