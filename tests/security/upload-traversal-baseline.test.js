const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createUploadApp } = require('../helpers/api-router');

function multipartBody(boundary, filename) {
  return Buffer.from(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="image"; filename="${filename}"`,
      'Content-Type: image/png',
      '',
      'not really an image',
      `--${boundary}--`,
      '',
    ].join('\r\n')
  );
}

describe('Phase 1 image upload path traversal baseline', () => {
  let tempRoot;
  let previousAyoitsonDatabase;
  let previousDatabase;

  beforeEach(() => {
    previousAyoitsonDatabase = process.env.AYOITSON_DATABASE;
    previousDatabase = process.env.DATABASE;
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-upload-'));
    delete process.env.DATABASE;
    process.env.AYOITSON_DATABASE = path.join(tempRoot, 'db');
    fs.mkdirSync(
      path.join(process.env.AYOITSON_DATABASE, 'images', 'uploads'),
      {
        recursive: true,
      }
    );
  });

  afterEach(() => {
    restoreEnv('AYOITSON_DATABASE', previousAyoitsonDatabase);
    restoreEnv('DATABASE', previousDatabase);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test.each(['bad/name.png', 'bad\\name.png', 'bad..png'])(
    'unsafe filename "%s" is rejected with 400',
    async (filename) => {
      const boundary = '----ayoitsonBoundary';
      const app = createUploadApp({
        preservePath: true,
        safeFileNames: false,
      });
      const response = await request(app)
        .post('/api/uploads/image')
        .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
        .send(multipartBody(boundary, filename));

      expect(response.status).toBe(400);
      expect(
        fs.readdirSync(
          path.join(process.env.AYOITSON_DATABASE, 'images', 'uploads')
        )
      ).toEqual([]);
    }
  );

  test('path traversal filenames do not escape the uploads directory', async () => {
    const app = createUploadApp({
      preservePath: true,
      safeFileNames: false,
    });
    const response = await request(app)
      .post('/api/uploads/image')
      .attach('image', Buffer.from('not really an image'), {
        filename: '..outside-upload.txt',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(fs.existsSync(path.join(tempRoot, 'outside-upload.txt'))).toBe(
      false
    );
  });

  test('accepted uploads use a server-generated name on disk', async () => {
    const app = createUploadApp();
    const response = await request(app)
      .post('/api/uploads/image')
      .attach('image', Buffer.from('not really an image'), {
        filename: 'logo.png',
        contentType: 'image/png',
      });

    expect([200, 201]).toContain(response.status);
    expect(response.body.data.name).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/
    );
    expect(response.body.data.originalName).toBe('logo.png');
    expect(
      response.body.data.fileUrl.endsWith(
        `/images/uploads/${response.body.data.name}`
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          process.env.AYOITSON_DATABASE,
          'images',
          'uploads',
          response.body.data.name
        )
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          process.env.AYOITSON_DATABASE,
          'images',
          'uploads',
          'logo.png'
        )
      )
    ).toBe(false);
  });
});

function restoreEnv(name, value) {
  if (typeof value === 'undefined') {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
