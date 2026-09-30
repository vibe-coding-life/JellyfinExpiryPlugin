# Security Policy

Jellyfin Expiry can delete media files when real deletion is enabled, so deletion-related bugs are treated as security-sensitive data-loss issues.

## Reporting a vulnerability

Please use GitHub's private security advisory/reporting feature for vulnerabilities or potential data-loss issues where possible. Avoid posting access tokens, server addresses, media paths, or other private server information in a public issue.

For ordinary bugs that do not expose private information or risk unintended deletion, use the public issue tracker.

## Safe testing

Keep **Dry Run** enabled while validating a new installation or upgrade. Confirm the scheduled item, expiry time, and delete-files setting before enabling real deletion.
