# Contributing

## Development Setup

```sh
npm install
npm run build
npm start
```

Use Node.js 22 for local development and CI parity.

## Required Checks

Run these before opening a pull request:

```sh
npm run lint
npm test
npm run audit
npm run secret-scan
npm run sbom
```

The security workflow blocks on npm production audit, gitleaks, and OSV.

## API Changes

If a public `/api/*` route changes, update `docs/openapi.yaml` and run:

```sh
npm run gen:api-types
npx vitest run --config vitest.config.mjs tests/alpha/openapi-roundtrip.test.js
```

## Secrets

Never commit API keys, Plex tokens, certificates, private keys, database files,
or `.ayoitson/` runtime data. Use `.env`-style local shell exports for
development-only values.

## License

Ayoitson modifications are GPL-2.0-or-later. Preserve all upstream copyright
and attribution notices when editing files derived from dizqueTV or
pseudotv-plex.
