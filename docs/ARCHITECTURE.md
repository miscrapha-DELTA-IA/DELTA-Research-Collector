# Architecture / Arquitetura

The extension uses **Manifest V3** and three executable JavaScript files at the repository root.

- `manifest.json` defines supported pages and permissions (`downloads`, `storage`, `unlimitedStorage`) and provider-specific host permissions.
- `content.js` detects supported pages, displays the floating button and settings panel, and forwards commands to the extension background worker.
- `collector-core.js` normalizes bibliographic records, builds API/search URLs, performs format conversion and deduplication; it also exports helpers for unit tests.
- `background.js` coordinates provider requests and download/storage operations.
- `chrome.storage.local` persists a local library and event history. No proprietary remote database is used.

## Extension packaging

The `manifest.json` **must stay in the top-level directory of the folder selected via Load unpacked**. Reorganizing production JS into `src/` requires changing manifest references and updating tests. The root layout is intentional for immediate installation. `dist/` contains the installable ZIP for v0.3.0.

## Principles

Preserve the original search URL and filters where feasible; explicitly reject filters that cannot be represented rather than silently dropping them. Limit requests and indicate partial results. Avoid downloading files behind restricted access or bypassing service rate limits.
