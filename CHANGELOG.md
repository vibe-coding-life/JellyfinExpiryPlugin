# Changelog

All notable changes to Jellyfin Expiry will be documented in this file.

## [1.0.0.0] - Unreleased

### Added

- Schedule movie expiry from the Jellyfin movie three-dot menu.
- Cancel an existing expiry from the same menu.
- Preset expiry periods of 24 hours, 7 days, 14 days, and 30 days.
- Custom expiry periods in whole days.
- Admin-only scheduling API.
- Poster banners showing `Expires in X days` for scheduled movies.
- Plugin settings page with enable/disable, dry-run, default expiry period, delete-files mode, movie search, queue display, and cancellation.
- Background expiry processor.
- Linux/systemd web integration helper that restores the Jellyfin Web loader after package updates.
- Installer and uninstaller for the Debian/Ubuntu-style Jellyfin package layout.

### Safety

- Expiry processing respects the plugin `Enabled` switch.
- Dry-run mode does not mark due items as completed, allowing them to be processed later when dry-run is disabled.
- File deletion follows the configured `DeleteFiles` setting.
