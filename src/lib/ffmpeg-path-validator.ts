const fs = require('fs');
const path = require('path');

const FFMPEG_PATH_PATTERN = /^[A-Za-z0-9_./-]+$/;
const WELL_KNOWN_FFMPEG_PATHS = Object.freeze([
  '/usr/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/opt/homebrew/bin/ffmpeg',
  '/opt/local/bin/ffmpeg',
  '/snap/bin/ffmpeg',
]);

type FFmpegPathValidationResult = {
  ok: boolean;
  error?: string;
  path?: string;
};

function validateFFmpegPath(input: unknown): FFmpegPathValidationResult {
  if (typeof input !== 'string' || input.length === 0) {
    return {
      ok: false,
      error: 'ffmpeg path is required.',
    };
  }

  if (!FFMPEG_PATH_PATTERN.test(input)) {
    return {
      ok: false,
      error: 'ffmpeg path contains invalid characters.',
    };
  }

  const normalizedPath = path.normalize(input);
  if (!path.isAbsolute(normalizedPath)) {
    return {
      ok: false,
      error: 'ffmpeg path must be an absolute file path.',
    };
  }

  if (path.basename(normalizedPath) !== 'ffmpeg') {
    return {
      ok: false,
      error: 'ffmpeg path must point to an ffmpeg binary.',
    };
  }

  try {
    const stats = fs.statSync(normalizedPath);
    return {
      ok: stats.isFile(),
      error: stats.isFile() ? undefined : 'ffmpeg path must point to a file.',
      path: normalizedPath,
    };
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'ENOENT'
    ) {
      return {
        ok: false,
        error: 'ffmpeg path does not exist.',
      };
    }
    throw err;
  }
}

function listWellKnownFFmpegPaths() {
  return WELL_KNOWN_FFMPEG_PATHS.filter((candidate) =>
    fs.existsSync(candidate)
  );
}

module.exports = {
  FFMPEG_PATH_PATTERN,
  WELL_KNOWN_FFMPEG_PATHS,
  listWellKnownFFmpegPaths,
  validateFFmpegPath,
};

export {
  FFMPEG_PATH_PATTERN,
  WELL_KNOWN_FFMPEG_PATHS,
  listWellKnownFFmpegPaths,
  validateFFmpegPath,
};
