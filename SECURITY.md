# Security Policy

## Supported Versions

Security fixes target the active development branch until the first public
release line is tagged.

## Reporting A Vulnerability

Do not open public issues for exploitable vulnerabilities or leaked secrets.
Send the report privately to the repository maintainer with:

- affected version or commit
- steps to reproduce
- expected impact
- any proof-of-concept payloads or logs

The maintainer should acknowledge receipt within 7 days and provide a fix or
mitigation plan before public disclosure.

## Local Security Model

Ayoitson is a single-tenant self-hosted service intended for private networks
or a trusted reverse proxy. Control-plane APIs require `X-API-Key`. Provider
feeds used by tuner/IPTV clients are intentionally public to the local network.

## Secret Rotation

See `docs/runbooks/secret-rotation.md` for API-key and Plex-token rotation.
