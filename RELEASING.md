# Releasing Jellyfin Expiry

## v1.0.x release checklist

1. Build and test the plugin on the supported Jellyfin version with **Dry Run** enabled first.
2. Confirm movie-menu scheduling, cancellation, custom days, and poster expiry banners.
3. Confirm a due dry-run entry remains pending.
4. Confirm `DeleteFiles=false` and `DeleteFiles=true` behave as documented using disposable test media.
5. Build the release DLL:

   `dotnet build -c Release`

6. Package the release:

   `./scripts/package-release.sh 1.0.0.0`

7. Verify `SHA256SUMS` and run the release privacy/secret audit.
8. Test the packaged Linux installer on the supported Jellyfin version and confirm Jellyfin reaches `Startup complete`.
9. Confirm the plugin loads, the embedded web resource returns HTTP 200, and the movie-menu/banner UI still works after a hard browser refresh.
10. Create the GitHub release and upload:
    - `JellyfinExpiry-plugin_1.0.0.0.zip`
    - `JellyfinExpiry-linux_1.0.0.0.tar.gz`
    - `SHA256SUMS`
11. Verify the published checksums from a fresh download.

## Jellyfin catalog note

Do not publish the plugin-only ZIP as a complete v1.0.0 installation path through a Jellyfin repository manifest yet. The current movie-menu and poster-banner integration also requires the Linux web-loader/systemd hook, which Jellyfin's normal plugin catalog installation does not install.

For v1.0.0.0, the supported full installation path is the packaged Linux archive and `install.sh`.
