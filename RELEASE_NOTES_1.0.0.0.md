# Jellyfin Expiry v1.0.0.0

First public release of Jellyfin Expiry.

## Highlights

- Schedule movie expiry from the Jellyfin movie three-dot menu.
- Cancel scheduled expiry from the same menu.
- Presets for 24 hours, 7 days, 14 days, and 30 days.
- Custom expiry periods.
- Poster banners showing `Expires in X days`.
- Administrator-only scheduling controls and API.
- Jellyfin plugin settings page with queue management.
- Dry-run safety mode.
- Optional media-file deletion.
- Linux/systemd installer and uninstaller.
- Self-healing Jellyfin Web loader hook.

## Tested platform

This release has been tested with:

- Jellyfin Server 12.1.0
- Jellyfin Web 12.1.0
- Linux with systemd
- Debian/Ubuntu-style Jellyfin package layout

Docker, Windows, and other Jellyfin Web versions are not yet supported/tested for this release.

## Recommended installation

Use:

`JellyfinExpiry-linux_1.0.0.0.tar.gz`

Extract the archive, review the included scripts, then run:

`sudo ./install.sh`

Keep **Dry Run** enabled until you have verified your configuration.

The standalone plugin ZIP is included as a release artifact, but it does not install the web-loader/systemd integration required for the movie-menu actions and poster banners.

## Safety

Jellyfin Expiry can delete media files when expiry processing and file deletion are enabled.

The default configuration is conservative:

- expiry processing starts disabled;
- Dry Run starts enabled;
- Delete files starts disabled.

Test with disposable media before enabling real deletion.

## Checksums

Release SHA256 checksums are provided in `SHA256SUMS`.
