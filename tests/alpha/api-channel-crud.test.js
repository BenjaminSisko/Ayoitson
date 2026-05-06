// tests/alpha/api-channel-crud.test.js
//
// Channel CRUD via the Phase 4 redesigned API (POST /, PUT /:number,
// DELETE /:number, GET /, GET /:number).
//
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const request = require('supertest');

const { createApiApp } = require('../helpers/api-router');

describe('Phase 4 channels API', () => {
  test('GET /api/channels lists channel summaries', async () => {
    const response = await request(createApiApp()).get('/api/channels');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ number: 1 }]);
  });

  test('GET /api/channels/:number returns the channel', async () => {
    const response = await request(createApiApp()).get('/api/channels/1');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      number: 1,
      name: 'Existing Channel',
    });
  });

  test('GET /api/channels/:number with ?programless=true strips programs', async () => {
    const response = await request(createApiApp()).get(
      '/api/channels/1?programless=true'
    );
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('programs');
  });

  test('GET /api/channels/:number returns 404 envelope for unknown number', async () => {
    const response = await request(createApiApp()).get('/api/channels/9999');
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  test('POST /api/channels creates and PUT /api/channels/:number updates', async () => {
    const app = createApiApp();
    const created = {
      number: 7,
      name: 'Created Channel',
      programs: [],
      fallback: [],
    };

    const createResponse = await request(app)
      .post('/api/channels')
      .send(created);
    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toEqual({ number: 7 });

    const readResponse = await request(app).get('/api/channels/7');
    expect(readResponse.status).toBe(200);
    expect(readResponse.body).toMatchObject(created);

    const updateResponse = await request(app)
      .put('/api/channels/7')
      .send({ ...created, name: 'Updated Channel' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toEqual({ number: 7 });

    const updatedRead = await request(app).get('/api/channels/7');
    expect(updatedRead.body).toMatchObject({ name: 'Updated Channel' });
  });

  test('DELETE /api/channels/:number removes the channel', async () => {
    const app = createApiApp();
    const deleteResponse = await request(app).delete('/api/channels/1');
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toMatchObject({ deleted: true, number: 1 });

    const readResponse = await request(app).get('/api/channels/1');
    expect(readResponse.status).toBe(404);
    expect(readResponse.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  test('POST /api/channels with missing number returns VALIDATION_ERROR', async () => {
    const response = await request(createApiApp())
      .post('/api/channels')
      .send({ name: 'No Number' });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
