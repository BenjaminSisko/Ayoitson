// tests/alpha/api-filler-customshow.test.js
// — Claude (Anthropic), Lane Alpha · 2026-05-06

const request = require('supertest');

const { createApiApp } = require('../helpers/api-router');

describe('Phase 4 filler-lists API', () => {
  test('GET /api/filler-lists returns an array', async () => {
    const r = await request(createApiApp()).get('/api/filler-lists');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  test('POST /api/filler-lists returns 201 with id', async () => {
    const r = await request(createApiApp())
      .post('/api/filler-lists')
      .send({ name: 'shorts' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ id: 'fixture' });
  });

  test('GET /api/filler-lists/:id returns the filler', async () => {
    const r = await request(createApiApp()).get('/api/filler-lists/fixture');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: 'fixture' });
  });

  test('PUT /api/filler-lists/:id acknowledges', async () => {
    const r = await request(createApiApp())
      .put('/api/filler-lists/fixture')
      .send({ name: 'updated' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ updated: true, id: 'fixture' });
  });

  test('DELETE /api/filler-lists/:id acknowledges', async () => {
    const r = await request(createApiApp()).delete('/api/filler-lists/fixture');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ deleted: true, id: 'fixture' });
  });

  test('GET /api/filler-lists/:id/channels returns array', async () => {
    const r = await request(createApiApp()).get(
      '/api/filler-lists/fixture/channels'
    );
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });
});

describe('Phase 4 custom-shows API', () => {
  test('GET /api/custom-shows returns array', async () => {
    const r = await request(createApiApp()).get('/api/custom-shows');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  test('POST /api/custom-shows -> 201', async () => {
    const r = await request(createApiApp())
      .post('/api/custom-shows')
      .send({ name: 'cartoons' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ id: 'fixture' });
  });

  test('GET/PUT/DELETE on /api/custom-shows/:id', async () => {
    const app = createApiApp();
    const get = await request(app).get('/api/custom-shows/fixture');
    expect(get.status).toBe(200);
    const put = await request(app)
      .put('/api/custom-shows/fixture')
      .send({ name: 'x' });
    expect(put.status).toBe(200);
    const del = await request(app).delete('/api/custom-shows/fixture');
    expect(del.status).toBe(200);
  });
});
