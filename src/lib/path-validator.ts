const path = require('path') as typeof import('path');

export type SafeFsPath = string & { readonly __brand: 'SafePath' };

function validatePath(input: string, baseDir?: string): SafeFsPath {
  if (typeof input !== 'string' || input.length === 0) {
    throw new Error('Path must be a non-empty string');
  }

  if (input.includes('\0')) {
    throw new Error('Path contains a null byte');
  }

  if (hasParentTraversal(input)) {
    throw new Error('Path may not contain parent-directory segments');
  }

  const base = baseDir ? path.resolve(baseDir) : undefined;
  const resolved = base ? path.resolve(base, input) : path.resolve(input);

  if (base && !isInsideBase(resolved, base)) {
    throw new Error('Path resolves outside the allowed base directory');
  }

  return resolved as SafeFsPath;
}

function hasParentTraversal(input: string): boolean {
  return input.split(/[\\/]+/).some((segment) => segment === '..');
}

function isInsideBase(resolved: string, base: string): boolean {
  const relative = path.relative(base, resolved);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

module.exports = {
  validatePath,
};
