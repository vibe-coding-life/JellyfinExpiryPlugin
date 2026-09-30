# Jellyfin Expiry

Jellyfin Expiry is an admin-focused Jellyfin plugin for scheduling automatic movie expiry and deletion directly from the Jellyfin interface.

It adds expiry controls to movie menus, supports fixed and custom expiry periods, shows scheduled expiries in the plugin settings page, and displays an **“Expires in X days”** banner on scheduled movie posters.

> **Status:** v1.0.0 is being prepared for public release. The current build has been tested on Jellyfin Web **12.1.0** on Linux with systemd.

## Features

- Schedule movie expiry from the movie **⋮** menu
- Cancel an existing expiry from the same menu
- Preset expiry periods:
  - 24 hours
  - 7 days
  - 14 days
  - 30 days
- Custom expiry period in days
- Poster banner showing **Expires in X days**
- Admin-only scheduling controls
- Plugin settings page with:
  - enable / disable expiry processing
  - dry-run mode
  - default expiry period
  - deletion mode
  - movie search
  - scheduled movie queue
  - cancel expiry
- Automatic expiry processing in Jellyfin
- Self-healing Jellyfin Web hook on supported Linux/systemd installs

## Screenshots

Screenshots will be added before the v1.0.0 release.

## Compatibility

The first public release is being prepared against:

- Jellyfin Server / Web: **12.1.0**
- Linux
- systemd-based Jellyfin installations

The backend plugin is more portable than the current web integration, but the movie-menu actions and poster banners depend on a small Jellyfin Web hook. For that reason, v1.0.0 will initially be conservative about supported versions.

Docker, Windows, and additional Jellyfin Web versions are planned for later testing.

## Installation

Public installation instructions will be added with the first v1.0.0 release.

The planned Linux installer will:

1. Check the installed Jellyfin / Jellyfin Web version.
2. Back up any Jellyfin Web files it needs to touch.
3. Install the Jellyfin Expiry plugin.
4. Install the small web-loader hook required for movie-menu actions and poster banners.
5. Install a self-healing systemd hook so Jellyfin Web package updates can restore the loader automatically.
6. Restart Jellyfin.

An uninstall script will reverse the web integration cleanly.

## Safety

Jellyfin Expiry is capable of deleting media files.

Before enabling real deletion:

- test with **Dry Run** enabled;
- verify scheduled expiry dates;
- keep backups of important media and configuration;
- confirm the configured deletion behavior matches what you expect.

The plugin exposes its scheduling API only to Jellyfin administrators.

## How it works

The plugin has two parts:

1. **Server plugin**
   - stores expiry schedules;
   - validates movie items;
   - processes due expiries;
   - provides the plugin configuration page and administrator-only API.

2. **Jellyfin Web integration**
   - adds **Schedule expiry / Cancel expiry** to movie menus;
   - shows the custom expiry dialog;
   - renders **Expires in X days** on scheduled movie posters.

The Web integration is loaded from the plugin itself. On supported Linux installations, a small systemd pre-start hook ensures Jellyfin Web continues loading it after Jellyfin Web package updates.

## Development

The project currently targets **.NET 10** and is being developed against Jellyfin 12.1.0.

The initial v1.0.0 release will include:

- source code;
- compiled plugin package;
- Linux installer;
- Linux uninstaller;
- checksums;
- release notes;
- Jellyfin repository manifest.

## Roadmap

- [ ] v1.0.0 Linux/systemd release
- [ ] Public Jellyfin plugin repository manifest
- [ ] Docker installation support
- [ ] Windows installation support
- [ ] Wider Jellyfin version compatibility testing
- [ ] Automated build/release workflow

## License

This project is intended to be released under the **GNU General Public License v3.0**.

## Disclaimer

Jellyfin Expiry is an independent community project and is not affiliated with or endorsed by the Jellyfin project.
