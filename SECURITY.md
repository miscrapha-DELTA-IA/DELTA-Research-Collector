# Security policy / Política de segurança

## Supported version

Security reports should target the latest public release in this repository (currently **v0.3.0**).

## Reporting

If you discover a vulnerability, **do not post exploitation details or private credentials in a public Issue**. Contact the maintainer through the repository owner's GitHub profile or the repository's private vulnerability-reporting feature, if enabled.

## Scope and privacy

The extension uses host permissions for supported scholarly providers and local browser storage for history and library records. It should not transmit records to a proprietary DELTA IA backend or bypass paywalls/CAPTCHAs. Contributors should minimize host permissions, prevent CSV formula injection and sanitize content shown in the UI.
