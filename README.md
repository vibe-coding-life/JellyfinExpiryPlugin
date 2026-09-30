# Jellyfin Expiry

Jellyfin Expiry is an administrator-focused Jellyfin plugin for scheduling automatic movie expiry and deletion directly from the Jellyfin interface.

It adds **Schedule expiry / Cancel expiry** to movie three-dot menus, supports preset and custom expiry periods, keeps a scheduled-movie queue in the plugin settings page, and displays an **Expires in X days** banner on scheduled movie posters.

> **Release status:** v1.0.0.0 is being prepared and tested. The current frontend integration is tested with Jellyfin Web 12.1.0 on the Debian/Ubuntu-style Linux package layout using systemd.

## Features

- Schedule expiry from a movie's **⋮** menu.
- Cancel an existing expiry from the same menu.
- Presets for 24 hours, 7 days, 14 days, and 30 days.
- Custom expiry periods in whole days.
- Poster banners showing **Expires in X days**.
- Admin-only scheduling API and controls.
- Configuration page with:
  - enable / disable processing;
  - dry-run mode;
  - default expiry period;
  - keep-files or delete-files mode;
  - movie search;
  - scheduled movie queue;
  - cancel expiry.
- Background expiry processing every five minutes.
- Self-healing Jellyfin Web hook for supported Linux/systemd installations.

## Safety first

Jellyfin Expiry is capable of deleting media files.

The default configuration is intentionally conservative:

- expiry processing is disabled until enabled by an administrator;
- **Dry Run** defaults to enabled;
- **Delete files** defaults to disabled.

Before enabling real deletion, test with disposable media and confirm the scheduled item, expiry time, and delete-files setting.

## Compatibility

The first public release is intentionally narrow while the frontend integration is tested more broadly.

### Tested

- Jellyfin Web **12.1.0**
- Linux with systemd
- Debian/Ubuntu-style Jellyfin package layout:
  - Jellyfin Web: `/usr/share/jellyfin/web`
  - plugins: `/var/lib/jellyfin/plugins`
  - data: `/var/lib/jellyfin/data`

### Not yet tested for v1.0.0.0

- Docker installations
- Windows installations
- other Jellyfin Web versions/layouts

The server-side plugin is more portable than the current web integration. The movie-menu controls and poster banners require a small loader hook in Jellyfin Web, so the initial installer performs compatibility checks and backs up the web files before changing them.

## Installation

A packaged v1.0.0.0 release is not published yet. When it is available, the recommended Linux installation will be:

1. Download `JellyfinExpiry-linux_1.0.0.0.tar.gz` from the GitHub release.
2. Extract it.
3. Review the included scripts.
4. Run:

   `sudo ./install.sh`

The installer will:

1. verify the expected Jellyfin Web layout;
2. back up `index.html`, `config.json`, and any existing Jellyfin Expiry DLL;
3. install the plugin DLL;
4. install the web-loader helper;
5. add a systemd pre-start hook so Jellyfin Web updates can restore the loader automatically;
6. restart Jellyfin and verify the service is active.

After installation, open **Dashboard → Plugins → Jellyfin Expiry** and keep **Dry Run** enabled while testing.

### Custom paths

The Linux installer supports environment overrides for non-default layouts:

- `JELLYFIN_WEB_DIR`
- `JELLYFIN_PLUGIN_DIR`
- `JELLYFIN_SERVICE`
- `JELLYFIN_EXPIRY_BACKUP_DIR`

Example:

`sudo JELLYFIN_WEB_DIR=/custom/jellyfin/web ./install.sh`

## Uninstall

From the extracted release directory:

`sudo ./uninstall.sh`

The normal uninstall removes the plugin and web integration but preserves the expiry database.

To also remove the expiry database:

`sudo ./uninstall.sh --purge-data`

## How it works

Jellyfin Expiry has two parts.

### Server plugin

The C# plugin:

- stores expiry schedules in SQLite;
- validates that scheduled items are movies with local paths;
- exposes administrator-only scheduling endpoints;
- processes due entries in the background;
- honours the **Enabled**, **Dry Run**, and **Delete files** settings;
- provides the Jellyfin plugin configuration page.

### Jellyfin Web integration

The embedded JavaScript:

- adds **Schedule expiry / Cancel expiry** to movie action sheets;
- provides the custom expiry dialog;
- displays scheduled expiry dates in the action menu;
- renders **Expires in X days** over scheduled movie posters.

Jellyfin Web does not currently expose these movie-card hooks to arbitrary server plugins through the normal plugin manifest, so the Linux installer adds a small loader to Jellyfin Web. The helper is designed to reapply only that loader after package updates and to fail open rather than prevent Jellyfin from starting.

## Building from source

The current source targets **.NET 10** and, for the initial Linux release, references the Jellyfin assemblies installed in `/usr/lib/jellyfin/bin`.

On a compatible development system:

`dotnet build -c Release`

Release packaging can then be generated with:

`./scripts/package-release.sh 1.0.0.0`

## Project status / roadmap

- [x] Core expiry scheduler
- [x] Dry-run safety mode
- [x] Movie menu schedule/cancel actions
- [x] Custom expiry dialog
- [x] Poster expiry banners
- [x] Linux/systemd self-healing web hook
- [x] Linux installer/uninstaller scaffolding
- [ ] Final v1.0.0.0 clean-install test
- [ ] GitHub v1.0.0.0 release
- [ ] Jellyfin repository manifest
- [ ] Docker installation support
- [ ] Windows installation support
- [ ] Wider Jellyfin version compatibility testing
- [ ] Automated build/release workflow

## License

Jellyfin Expiry is released under the **GNU General Public License v3.0**. Jellyfin's plugin template recommends GPLv3 (or a compatible permissive license) because compiled plugins link against Jellyfin packages licensed under GPLv3.

## Disclaimer

Jellyfin Expiry is an independent community project and is not affiliated with or endorsed by the Jellyfin project.