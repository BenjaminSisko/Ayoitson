const fs = require('fs');
const path = require('path');

const indexSource = () =>
  fs.readFileSync(path.join(__dirname, '..', '..', 'index.js'), 'utf8');

describe('Phase 1 upload and body parser hardening', () => {
  test('JSON bodies are capped at 1MB', () => {
    expect(indexSource()).toContain("bodyParser.json({limit: '1mb'})");
  });

  test('multipart uploads have size, count, and filename safety controls', () => {
    const source = indexSource();

    expect(source).toContain('fileSize: 10 * 1024 * 1024');
    expect(source).toContain('files: 1');
    expect(source).toContain('abortOnLimit: true');
    expect(source).toContain('safeFileNames: true');
    expect(source).toContain('preserveExtension: true');
    expect(source).not.toContain('createParentPath: true');
  });

  test('unlockPath is local rather than a global assignment', () => {
    expect(indexSource()).toContain('let unlockPath = false;');
  });

  test('trust proxy is set to loopback,linklocal,uniquelocal (closes F9-trustproxy)', () => {
    expect(indexSource()).toContain(
      "app.set('trust proxy', 'loopback,linklocal,uniquelocal')"
    );
  });

  test('Phase 4 security middleware is wired in', () => {
    const source = indexSource();
    expect(source).toContain("require('./src/middleware/auth')");
    expect(source).toContain("require('./src/middleware/helmet')");
    expect(source).toContain("require('./src/middleware/cors')");
    expect(source).toContain("require('./src/middleware/rate-limit')");
    expect(source).toContain("app.use('/api', requireApiKey)");
  });
});
