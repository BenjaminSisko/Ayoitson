const fs = require('fs');
const path = require('path');

const { apiCompose, createMockDependencies } = require('../helpers/api-router');

const OPENAPI_PATH = path.resolve(__dirname, '../../docs/openapi.yaml');
const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);

const EXCLUDED_ROUTES = [
  // Add entries here only for intentionally private/internal /api routes.
  // Shape: { method: 'GET', path: '/api/example', reason: '...' }
  {
    method: 'GET',
    path: '/api/channelNumbers',
    reason:
      'Temporary legacy AngularJS UI alias; not part of the Phase 4 public API contract.',
  },
  {
    method: 'GET',
    path: '/api/channel/:number',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/channels/{number}.',
  },
  {
    method: 'GET',
    path: '/api/channel/description/:number',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/channels/{number}/description.',
  },
  {
    method: 'GET',
    path: '/api/channel/programless/:number',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/channels/{number}?programless=true.',
  },
  {
    method: 'GET',
    path: '/api/channel/programs/:number',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/channels/{number}/programs.',
  },
  {
    method: 'POST',
    path: '/api/channel',
    reason: 'Temporary legacy AngularJS UI alias; use POST /api/channels.',
  },
  {
    method: 'PUT',
    path: '/api/channel',
    reason:
      'Temporary legacy AngularJS UI alias; use PUT /api/channels/{number}.',
  },
  {
    method: 'DELETE',
    path: '/api/channel',
    reason:
      'Temporary legacy AngularJS UI alias; use DELETE /api/channels/{number}.',
  },
  {
    method: 'POST',
    path: '/api/upload/image',
    reason: 'Temporary legacy AngularJS UI alias; use POST /api/uploads/image.',
  },
  {
    method: 'GET',
    path: '/api/xmltv.xml',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/guide/xmltv.xml.',
  },
  {
    method: 'GET',
    path: '/api/channels.m3u',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/guide/channels.m3u.',
  },
  {
    method: 'POST',
    path: '/api/plex-servers/foreignstatus',
    reason:
      'Temporary legacy AngularJS UI alias; use POST /api/plex-servers/foreign-status-check.',
  },
  {
    method: 'PUT',
    path: '/api/plex-servers',
    reason:
      'Temporary legacy AngularJS UI alias for old create semantics; use POST /api/plex-servers.',
  },
  {
    method: 'DELETE',
    path: '/api/plex-servers',
    reason:
      'Temporary legacy AngularJS UI alias; use DELETE /api/plex-servers/{name}.',
  },
  {
    method: 'GET',
    path: '/api/fillers',
    reason: 'Temporary legacy AngularJS UI alias; use GET /api/filler-lists.',
  },
  {
    method: 'GET',
    path: '/api/filler/:id',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/filler-lists/{id}.',
  },
  {
    method: 'POST',
    path: '/api/filler/:id',
    reason:
      'Temporary legacy AngularJS UI alias; use PUT /api/filler-lists/{id}.',
  },
  {
    method: 'PUT',
    path: '/api/filler',
    reason: 'Temporary legacy AngularJS UI alias; use POST /api/filler-lists.',
  },
  {
    method: 'DELETE',
    path: '/api/filler/:id',
    reason:
      'Temporary legacy AngularJS UI alias; use DELETE /api/filler-lists/{id}.',
  },
  {
    method: 'GET',
    path: '/api/filler/:id/channels',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/filler-lists/{id}/channels.',
  },
  {
    method: 'GET',
    path: '/api/shows',
    reason: 'Temporary legacy AngularJS UI alias; use GET /api/custom-shows.',
  },
  {
    method: 'GET',
    path: '/api/show/:id',
    reason:
      'Temporary legacy AngularJS UI alias; use GET /api/custom-shows/{id}.',
  },
  {
    method: 'POST',
    path: '/api/show/:id',
    reason:
      'Temporary legacy AngularJS UI alias; use PUT /api/custom-shows/{id}.',
  },
  {
    method: 'PUT',
    path: '/api/show',
    reason: 'Temporary legacy AngularJS UI alias; use POST /api/custom-shows.',
  },
  {
    method: 'DELETE',
    path: '/api/show/:id',
    reason:
      'Temporary legacy AngularJS UI alias; use DELETE /api/custom-shows/{id}.',
  },
  {
    method: 'POST',
    path: '/api/channel-tools/time-slots',
    reason:
      'Temporary legacy AngularJS UI alias; use POST /api/guide/time-slots.',
  },
  {
    method: 'POST',
    path: '/api/channel-tools/random-slots',
    reason:
      'Temporary legacy AngularJS UI alias; use POST /api/guide/random-slots.',
  },
  ...['ffmpeg', 'plex', 'xmltv', 'hdhr'].flatMap((section) => [
    {
      method: 'GET',
      path: `/api/${section}-settings`,
      reason: `Temporary legacy AngularJS UI alias; use GET /api/settings/${section}.`,
    },
    {
      method: 'PUT',
      path: `/api/${section}-settings`,
      reason: `Temporary legacy AngularJS UI alias; use PUT /api/settings/${section}.`,
    },
    {
      method: 'POST',
      path: `/api/${section}-settings`,
      reason: `Temporary legacy AngularJS UI alias; use POST /api/settings/${section}/reset.`,
    },
  ]),
];

function routeKey(method, routePath) {
  return `${method.toUpperCase()} ${routePath}`;
}

function excludedKeys() {
  return new Set(
    EXCLUDED_ROUTES.map((route) => routeKey(route.method, route.path))
  );
}

function normalizeOpenApiPath(routePath) {
  return routePath.replace(/\{([^}]+)\}/g, ':$1');
}

function readDocumentedRoutes() {
  const routes = [];
  let currentPath = null;
  for (const line of fs.readFileSync(OPENAPI_PATH, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('components:')) {
      break;
    }
    const pathMatch = line.match(/^  (\/api\/[^:]+):\s*$/);
    if (pathMatch) {
      currentPath = normalizeOpenApiPath(pathMatch[1]);
      continue;
    }
    const methodMatch = line.match(/^    ([a-z]+):\s*$/);
    if (currentPath && methodMatch && HTTP_METHODS.has(methodMatch[1])) {
      routes.push(routeKey(methodMatch[1], currentPath));
    }
  }
  return routes;
}

function mountPathFromLayer(layer) {
  const source = layer.regexp && layer.regexp.source;
  if (!source || source === '^\\/?(?=\\/|$)') {
    return '';
  }
  return source
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\\\//g, '/')
    .replace(/\\\./g, '.')
    .replace(/\\-/g, '-');
}

function joinPaths(prefix, routePath) {
  const suffix = routePath === '/' ? '' : routePath;
  return `${prefix}${suffix}`.replace(/\/+/g, '/');
}

function walkExpressRoutes(stack, prefix = '') {
  const routes = [];
  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      for (const method of Object.keys(layer.route.methods)) {
        routes.push(routeKey(method, joinPaths(prefix, layer.route.path)));
      }
      continue;
    }
    if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      routes.push(
        ...walkExpressRoutes(
          layer.handle.stack,
          `${prefix}${mountPathFromLayer(layer)}`
        )
      );
    }
  }
  return routes;
}

function registeredApiRoutes() {
  const router = apiCompose.compose(createMockDependencies());
  return walkExpressRoutes(router.stack).filter((route) =>
    route.includes(' /api/')
  );
}

function withoutExcluded(routes) {
  const excluded = excludedKeys();
  return [...new Set(routes)].filter((route) => !excluded.has(route)).sort();
}

describe('OpenAPI route roundtrip', () => {
  test('docs/openapi.yaml matches the registered src/api router stack', () => {
    const documented = withoutExcluded(readDocumentedRoutes());
    const registered = withoutExcluded(registeredApiRoutes());

    const documentedSet = new Set(documented);
    const registeredSet = new Set(registered);

    const documentedButMissing = documented.filter(
      (route) => !registeredSet.has(route)
    );
    const registeredButUndocumented = registered.filter(
      (route) => !documentedSet.has(route)
    );

    expect(documentedButMissing).toEqual([]);
    expect(registeredButUndocumented).toEqual([]);
  });
});
