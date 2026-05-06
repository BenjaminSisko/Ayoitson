const fs = require('fs');
const path = require('path');

const FFMPEG_PATH_PATTERN = /^[A-Za-z0-9_./-]+$/;

function validateFFmpegPath(input) {
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

  try {
    const stats = fs.statSync(normalizedPath);
    return {
      ok: stats.isFile(),
      error: stats.isFile() ? undefined : 'ffmpeg path must point to a file.',
      path: normalizedPath,
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        ok: false,
        error: 'ffmpeg path does not exist.',
      };
    }
    throw err;
  }
}

module.exports = {
  FFMPEG_PATH_PATTERN,
  validateFFmpegPath,
};
