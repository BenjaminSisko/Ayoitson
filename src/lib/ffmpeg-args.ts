import {
  spawn,
  type ChildProcess,
  type SpawnOptions,
} from 'node:child_process';

export type SafeFFmpegArg = string & { readonly __brand: 'SafeFFmpegArg' };

export type SafeFFmpegArgOptions = {
  allowHeaders?: boolean;
  allowFilterGraph?: boolean;
  allowProtocols?: readonly string[];
};

const BLOCKED_PROTOCOLS = new Set([
  'concat',
  'data',
  'file',
  'pipe',
  'subfile',
]);

const SHELL_META_PATTERN = /[`$<>|]/;
const PROTOCOL_PATTERN = /^([A-Za-z][A-Za-z0-9+.-]*):/;

function normalizeAllowedProtocols(
  protocols: readonly string[] | undefined
): Set<string> {
  return new Set((protocols ?? []).map((protocol) => protocol.toLowerCase()));
}

export function makeSafeArg(
  input: string | number | boolean,
  options: SafeFFmpegArgOptions = {}
): SafeFFmpegArg {
  const value = String(input);

  if (value.includes('\0')) {
    throw new Error('FFmpeg argument contains a null byte');
  }

  if (!options.allowHeaders && /\r|\n/.test(value)) {
    throw new Error('FFmpeg argument contains a newline');
  }

  if (
    !options.allowFilterGraph &&
    !options.allowHeaders &&
    SHELL_META_PATTERN.test(value)
  ) {
    throw new Error('FFmpeg argument contains shell control characters');
  }

  const protocol = value.match(PROTOCOL_PATTERN)?.[1]?.toLowerCase();
  if (protocol && !options.allowFilterGraph && !options.allowHeaders) {
    const allowedProtocols = normalizeAllowedProtocols(options.allowProtocols);
    if (!allowedProtocols.has(protocol)) {
      throw new Error(`Blocked FFmpeg argument protocol: ${protocol}:`);
    }
  }

  return value as SafeFFmpegArg;
}

export function toSafeFfmpegArgs(
  args: ReadonlyArray<string | number | boolean>
): SafeFFmpegArg[] {
  return args.map((arg, index) => {
    const previous = String(args[index - 1] ?? '');
    const current = String(arg);

    if (previous === '-headers') {
      return makeSafeArg(current, { allowHeaders: true });
    }

    if (previous === '-filter_complex' || previous === '-vf') {
      return makeSafeArg(current, { allowFilterGraph: true });
    }

    if (previous === '-i') {
      return makeSafeArg(current, { allowProtocols: ['http', 'https'] });
    }

    if (current === 'pipe:1') {
      return makeSafeArg(current, { allowProtocols: ['pipe'] });
    }

    return makeSafeArg(current);
  });
}

export function spawnFfmpeg(
  ffmpegPath: string,
  args: readonly SafeFFmpegArg[],
  options?: SpawnOptions
): ChildProcess {
  if (options) {
    return spawn(ffmpegPath, [...args], options);
  }
  return spawn(ffmpegPath, [...args]);
}

export { escapeDrawtextLiteral } from './ffmpeg-escape';
