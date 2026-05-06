# Ayoitson 1.5.5

Create live TV channel streams from media on your Plex servers.

Ayoitson lets you build custom linear channels, publish them through an HDHomeRun-compatible tuner, and expose M3U/XMLTV outputs for IPTV clients. Fresh installs store runtime data in `.ayoitson/`, including the SQLite database and generated `xmltv.xml`.

## Features

- Configure channels, programs, filler content, logos, playback behavior, and guide settings from the web UI.
- Play channels through Plex, Jellyfin, Emby, or third-party IPTV players.
- Mock an HDHomeRun tuner for DVR-style discovery while keeping the required Silicondust compatibility fields.
- Use media across multiple Plex servers.
- Generate M3U and XMLTV outputs for external clients.
- Optionally transcode with FFmpeg, normalize audio/video, and support Nvidia hardware encoding in Docker.
- Build packaged binaries for Windows, Linux, and macOS.

## Runtime Data

Ayoitson uses `.ayoitson/` by default. Set `AYOITSON_DATABASE=/path/to/data` to use a different data folder. The older `DATABASE` environment variable still works for one compatibility release and emits a deprecation warning.

The `--database` CLI flag remains supported and has the highest priority for a single launch.

## Limitations

- Plex DVR playback through the spoofed HDHomeRun tuner requires Plex Pass.
- Ayoitson does not watch Plex libraries for media updates. Re-add affected programs after Plex media or server settings change.
- Large video/audio format changes between episodes can break some players unless FFmpeg transcoding is enabled.
- If Plex DVR is configured, Plex may continuously record or transcode channel content.
- Ayoitson is intended for private network use. Do not expose its ports directly to untrusted users or the public internet.

## Development

```sh
npm run build
npm run compile
npm run package
```

```sh
npm run dev-client
npm run dev-server
```

## License And Attribution

- Ayoitson is a fork of [dizqueTV](https://github.com/vexorian/dizquetv) by Victor Hugo Soliz Kuncar.
- Original pseudotv-Plex code was released under [MIT license (c) 2020 Dan Ferguson](https://github.com/DEFENDORe/pseudotv/blob/665e71e24ee5e93d9c9c90545addb53fdc235ff6/LICENSE).
- dizqueTV's improvements are released under zlib license (c) 2020 Victor Hugo Soliz Kuncar.
- FontAwesome: [https://fontawesome.com/license/free](https://archive.fo/PRqis)
- Bootstrap: https://github.com/twbs/bootstrap/blob/v4.4.1/LICENSE
