const request = require('supertest');
const { createAuthProbeApp, urlForRoute } = require('../helpers/api-router');

describe('Phase 1 API auth baseline', () => {
  test.fails('every /api/* route returns 401 without X-API-Key', async () => {
    const { app, routes } = createAuthProbeApp();
    const failures = [];

    for (const route of routes) {
      const response = await request(app)
        [route.method](urlForRoute(route.path))
        .send({});

      if (response.status !== 401) {
        failures.push(
          `${route.method.toUpperCase()} ${route.path} returned ${
            response.status
          }`
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
