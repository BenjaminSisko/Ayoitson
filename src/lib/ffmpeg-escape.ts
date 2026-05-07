const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function escapeDrawtextLiteral(input: unknown): string {
  return String(input ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=')
    .replace(/\r?\n|\r/g, ' ');
}

function createDrawtextFile(
  input: unknown,
  options: { tmpDir?: string } = {}
): string {
  const tmpDir = options.tmpDir || os.tmpdir();
  const filePath = path.join(tmpDir, `ayoitson-drawtext-${uuidv4()}.txt`);
  fs.writeFileSync(filePath, escapeDrawtextLiteral(input), {
    flag: 'wx',
    mode: 0o600,
  });
  return filePath;
}

function cleanupDrawtextFiles(files: string[]): void {
  for (const file of files) {
    try {
      fs.unlinkSync(file);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code !== 'ENOENT'
      ) {
        console.warn(`Unable to remove FFmpeg drawtext tempfile ${file}`, err);
      }
    }
  }
  files.length = 0;
}

module.exports = {
  cleanupDrawtextFiles,
  createDrawtextFile,
  escapeDrawtextLiteral,
};

export { cleanupDrawtextFiles, createDrawtextFile, escapeDrawtextLiteral };
