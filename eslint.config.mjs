import prettier from 'eslint-config-prettier';

const legacyGenerated = [
  '.ayoitson/**',
  '.dizquetv/**',
  'bin/**',
  'dist/**',
  'node_modules/**',
  'package-lock.json',
  'web/public/bundle.js',
];

const noExecSelectors = [
  {
    selector:
      "MemberExpression[object.type='CallExpression'][object.callee.name='require'][object.arguments.0.value='child_process'][property.name='exec']",
    message:
      'Use child_process.execFile or spawn(args[]) instead of child_process.exec.',
  },
  {
    selector:
      "VariableDeclarator[id.name='exec'][init.type='MemberExpression'][init.object.type='CallExpression'][init.object.callee.name='require'][init.object.arguments.0.value='child_process'][init.property.name='exec']",
    message:
      'Use child_process.execFile or spawn(args[]) instead of child_process.exec.',
  },
];

export default [
  {
    ignores: legacyGenerated,
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        angular: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        document: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      'no-restricted-syntax': ['error', ...noExecSelectors],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
      },
    },
    rules: {
      'no-restricted-syntax': ['error', ...noExecSelectors],
    },
  },
  {
    files: ['src/ffmpeg-info.js'],
    rules: {
      // Tracked as F3; Lane Gamma owns the Phase 1 exec -> execFile hot-fix.
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['tests/**/*.test.js'],
    languageOptions: {
      globals: {
        afterEach: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        test: 'readonly',
      },
    },
  },
  prettier,
];
