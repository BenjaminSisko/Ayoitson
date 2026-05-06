import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const legacyGenerated = [
  '.ayoitson/**',
  '.dizquetv/**',
  // Transient smoke-test backups produced by integration runs.
  '.dizquetv-legacy-*/**',
  '.dizquetv.backup-*/**',
  '.dizquetv.backup-pre-codex-smoke-*/**',
  'bin/**',
  'dist/**',
  'node_modules/**',
  'package-lock.json',
  'web/dist/**',
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

const frontendRestrictedSelectors = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message:
      'Render operator/media text as text nodes. dangerouslySetInnerHTML is banned for CSP and XSS safety.',
  },
  {
    selector: "JSXAttribute[name.name='style']",
    message:
      'Inline style attributes are banned so the React frontend can run under strict CSP.',
  },
  {
    selector: "CallExpression[callee.name='eval']",
    message: 'eval is banned in the React frontend.',
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
    files: ['web/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        Response: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-restricted-syntax': ['error', ...frontendRestrictedSelectors],
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
