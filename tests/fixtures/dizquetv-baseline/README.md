# dizqueTV Baseline Fixture Placeholder

No real `.dizquetv/` data folder was available on this workstation during the Phase 1 Delta pass. This directory is therefore a placeholder that documents the fixture extraction shape required for the Phase 3 SQLite migration tests. It does not contain fabricated production data.

When a real fixture is available, copy a sanitized snapshot into this directory with this shape:

```text
tests/fixtures/dizquetv-baseline/
  manifest.json
  .dizquetv/
    channels/
      <channel-number>.json
    filler/
      <filler-id>.json
    custom-shows/
      <show-id>.json
    play-cache/
      <channel-number>/
        <base64-program-key>.json
    cache/
      images/
    images/
    plex-servers.json
    ffmpeg-settings.json
    plex-settings.json
    xmltv-settings.json
    hdhr-settings.json
    cache-images.json
    db-version.json
    client-id.json
    settings.json
```

Sanitization requirements:

- Replace every Plex token with deterministic test-only values before committing.
- Replace private hostnames, IP addresses, usernames, local paths, and media titles unless Benny explicitly marks the fixture safe to publish.
- Preserve array/object shape, field names, durations, schedule settings, and cross-file references.
- Record source path, extraction date, sanitization actions, file counts, and any intentionally omitted files in `manifest.json`.

The Phase 3 migration test should fail clearly if `.dizquetv/` is still absent here.

— Codex (OpenAI), Lane Delta · 2026-05-05
