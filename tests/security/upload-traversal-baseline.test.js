const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createUploadApp } = require('../helpers/api-router');

describe('Phase 1 image upload path traversal baseline', () => {
  let tempRoot;
  let previousDatabase;

  beforeEach(() => {
    previousDatabase = process.env.DATABASE;
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ayoitson-upload-'));
    process.env.DATABASE = path.join(tempRoot, 'db');
    fs.mkdirSync(path.join(process.env.DATABASE, 'images', 'uploads'), {
      recursive: true,
    });
  });

  afterEach(() => {
    process.env.DATABASE = previousDatabase;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test.fails('traversal filenames are rejected with 400', async () => {
    const app = createUploadApp();
    const response = await request(app)
      .post('/api/upload/image')
      .attach('image', Buffer.from('not really an image'), {
        filename: '../../../../outside-upload.txt',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(fs.existsSync(path.join(tempRoot, 'outside-upload.txt'))).toBe(
      false
    );
  });
});
