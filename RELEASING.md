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

7. Record the target Jellyfin ABI and update `manifest.json`.
8. Create the GitHub release and upload:
   - `JellyfinExpiry-plugin_1.0.0.0.zip`
   - `JellyfinExpiry-linux_1.0.0.0.tar.gz`
   - `SHA256SUMS`
9. Verify the published checksums from a fresh download.
10. Test a clean install using the published Linux archive before marking the release stable.

The Jellyfin repository manifest checksum is the MD5 of the plugin ZIP, matching the format used by Jellyfin plugin repositories.
