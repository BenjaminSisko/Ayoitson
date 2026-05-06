const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const originalResolveFilename = Module._resolveFilename;

function candidateTsPaths(request, parent) {
  if (!request.startsWith('.') && !path.isAbsolute(request)) {
    return [];
  }

  const base = path.isAbsolute(request)
    ? request
    : path.resolve(path.dirname(parent.filename), request);

  return [`${base}.ts`, path.join(base, 'index.ts')];
}

Module._resolveFilename = function resolveWithTs(
  request,
  parent,
  isMain,
  options
) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (err) {
    if (parent && parent.filename) {
      for (const candidate of candidateTsPaths(request, parent)) {
        if (fs.existsSync(candidate)) {
          return originalResolveFilename.call(
            this,
            candidate,
            parent,
            isMain,
            options
          );
        }
      }
    }
    throw err;
  }
};

require.extensions['.ts'] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });

  module._compile(output.outputText, filename);
};
