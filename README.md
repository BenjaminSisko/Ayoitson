# Ayoitson

Ayoitson creates private live-TV style channels from Plex media. It publishes
HDHomeRun-compatible discovery data plus M3U/XMLTV provider feeds so Plex,
Jellyfin, Emby, and IPTV clients can tune channels from one local service.

## Capabilities

- Build channels from Plex libraries, custom shows, filler, logos, and guide
  metadata.
- Stream channels through the browser, Plex DVR, HDHomeRun-style clients, or
  M3U consumers.
- Store runtime state in `.ayoitson/db.sqlite`, with encrypted Plex tokens and
  migration support from legacy `.dizquetv` data.
- Gate control-plane APIs with `X-API-Key`, helmet headers, rate limiting, and
  deny-by-default CORS.
- Run behind HTTP for private development or HTTPS by setting `HTTPS_CERT` and
  `HTTPS_KEY`.
- Generate CycloneDX SBOMs and signed release artifacts in CI.

## Quick Start

```sh
npm install
npm run build
npm start
```

Open `http://127.0.0.1:8000`.

Fresh installs require a master API key:

```sh
node scripts/first-run.js
```

Copy the printed key once and use it in the setup UI or with API requests:

```sh
curl -H "X-API-Key: ayo_..." http://127.0.0.1:8000/api/channels
```

## Runtime Data

Ayoitson uses `.ayoitson/` by default. Set `AYOITSON_DATABASE=/path/to/data` to
use another folder. The deprecated `DATABASE` environment variable still works
for one compatibility release and logs a warning. The `--database` CLI flag has
highest priority for one launch.

## HTTPS

For local development with `mkcert`:

```sh
npm run tls:dev
HTTPS_CERT=/path/to/localhost.pem HTTPS_KEY=/path/to/localhost-key.pem npm start
```

For production, place Ayoitson behind a trusted reverse proxy or provide a
certificate/key pair directly with `HTTPS_CERT` and `HTTPS_KEY`.

## Security And Release Checks

```sh
npm run lint
npm test
npm run audit
npm run secret-scan
npm run sbom
```

Release builds generate a CycloneDX SBOM and cosign keyless signatures for the
SBOM and packaged binaries.

## Limitations

- Plex DVR playback through the spoofed HDHomeRun tuner requires Plex Pass.
- Ayoitson does not watch Plex libraries for media updates.
- Major format changes between episodes can require FFmpeg transcoding.
- Ayoitson is intended for private networks or trusted reverse proxies. Do not
  expose it directly to untrusted users.

## Attribution

Ayoitson is a fork of dizqueTV by vexorian
(https://github.com/vexorian/dizquetv). dizqueTV is itself derived from
pseudotv-plex. Ayoitson is an altered source version and preserves upstream
copyright notices in `LICENSE`.

The project ships under the zlib license. Font Awesome and Bootstrap assets
retain their own upstream licenses.
