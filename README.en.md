<div align="center">

<img src="icons/128.png" alt="DELTA Research Collector icon" width="96">

# DELTA Research Collector

**Collect, organize and export scholarly search results straight from your browser.**

An experimental open-source extension for **Opera GX, Chrome and Edge** (Manifest V3).

[![Version](https://img.shields.io/badge/version-0.4.0-blue)](https://github.com/miscrapha-DELTA-IA/DELTA-Research-Collector) [![License](https://img.shields.io/badge/license-GPL--3.0--or--later-green)](LICENSE)

[Português](README.md) · [Installation](#installation) · [Supported sources](#supported-sources)

</div>

## Features

- An in-page button exports bibliographic records as **CSV, BibTeX, RIS (Zotero-compatible import)** or **JSON**.
- **Ten scholarly sources**, each using a source-specific adapter.
- **Local unified library**, DOI-based duplicate detection and provenance retention.
- **Search history**, including original URL, timestamp, counts and partial-results status.
- Optional retrieval of up to **20 arXiv PDFs**; other sources provide links when available.
- No DELTA IA account, token, or proprietary server.

> [!IMPORTANT]
> Experimental software. Exported results may be incomplete or differ from the site's own filters and ranking. Do not claim that a search is exhaustive without independent verification.

## Supported sources

| Source | Method | Caveat |
|---|---|---|
| arXiv | Paginated search HTML | Optional PDFs, max 20 |
| Europe PMC | Official API | Metadata and available abstracts |
| PubMed | NCBI ESearch + EFetch | Unsupported sidebar filters are blocked |
| OpenAlex | Official API | Abstracts where available |
| Crossref | Official API | Different coverage/ranking may apply |
| Semantic Scholar | Academic Graph API | Rate and result limits |
| DOAJ | Public article API | Complex UI filters are not preserved |
| SciELO | Experimental HTML parsing | Subject to HTML changes and blocking |
| bioRxiv | Official date-range API | Local text filter is not equivalent to web search |
| medRxiv | Official date-range API | Local text filter is not equivalent to web search |

## Installation

1. Download the [installable ZIP v0.4.0](dist/DELTA-Research-Collector_v0.4.0_INSTALAR.zip) and extract it to a permanent folder.
2. In Opera GX, navigate to `opera://extensions`, enable **Developer mode**, then choose **Load unpacked**. For Chrome/Edge, use the corresponding extension management page.
3. Select the folder containing `manifest.json` at its top level. Disable previous versions to avoid duplicate buttons.
4. Open an [arXiv search](https://arxiv.org/search/?query=bioinformatics&searchtype=all&size=50), refresh the page, and use the floating download button or settings gear.

Developers can also load **this repository's root** directly as an unpacked extension.

## Data and Zotero

The library uses `chrome.storage.local` (max **12,000 unique records**) and keeps the last **80 collection events**. Deduplication uses a normalized DOI or, when missing, source + identifier. RIS and BibTeX files can be **imported** into Zotero; direct Zotero sync is **not** implemented.

## Testing

Run with Node.js (no npm dependencies required):

```bash
node --check collector-core.js
node --check background.js
node --check content.js
node tests/test-core.cjs
node tests/test-background.cjs
```

These are local/unit checks and **do not verify live provider integrations**. See [scientific methodology](docs/METHODOLOGY.md), [architecture](docs/ARCHITECTURE.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md) and [changelog](CHANGELOG.md).

## Attribution and license

Inspired by [koenraijer/arxivcollector](https://github.com/koenraijer/arxivcollector) (GPL-3.0). This browser-extension implementation uses JavaScript. Distributed under **GPL-3.0-or-later**, see [LICENSE](LICENSE). An initiative of **DELTA IA**.

## v0.4.0 — IEEE and search strategy

The browser action now opens on the active page and does not redirect to arXiv. IEEE Xplore extraction captures visible result cards only, not complete search results. Every export records query strings, URL filters and access provenance. Optional DOI lookup uses OpenAlex (up to 20 DOIs); no indexed OA copy does not prove a paywall.
