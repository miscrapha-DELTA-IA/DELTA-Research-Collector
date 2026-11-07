# Contributing / Contribuindo

Thanks for improving DELTA Research Collector. Report reproducible bugs in Issues and propose focused Pull Requests.

## Before submitting

1. Check the latest version and existing issues.
2. For connector problems, include **source, example public URL, expected/observed counts, export format, browser, extension version, and error message**. Remove credentials and sensitive query details.
3. Prefer official metadata APIs. If scraping is necessary, handle missing elements and rate limits gracefully.
4. Do not silently drop user-selected filters or claim partial exports are complete. Preserve provenance.
5. Run the tests with Node.js before opening a pull request:

```bash
node tests/test-core.cjs
node tests/test-background.cjs
```

## Proposed pull request structure

Describe the problem, the solution, the source's API/ToS implications, and how you tested it. Add fixtures covering parsing edge cases and error responses. For translations, preserve scientific terminology and user-facing warnings.
