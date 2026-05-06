const fs = require('fs');
const path = require('path');

const { apiCompose, createMockDependencies } = require('../helpers/api-router');

const OPENAPI_PATH = path.resolve(__dirname, '../../docs/openapi.yaml');
const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);

const EXCLUDED_ROUTES = [
  // Add entries here only for intentionally private/internal /api routes.
  // Shape: { method: 'GET', path: '/api/example', reason: '...' }
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
