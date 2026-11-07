# Scientific usage and limitations / Uso científico e limitações

**Purpose:** aid preliminary collection and bibliography management. This is not a validated systematic-review extraction engine.

## Reproducibility fields

For each database search, retain: provider, original search URL, exact query terms, filters, date/time (UTC), requested limit, number retrieved, number stored, duplicates merged, and whether the run was partial. Compare the exported total with the live interface and state any disagreements in the study methods.

## Provider-specific caveats

- **CAPES:** experimental retrieval from visible search-page result cards and pagination. Metadata fields may be absent, pagination may stop early or reload, and full search coverage is not verified by automated tests. Preserve the original search URL, the portal's reported total, the output and any warnings. RIS/BibTeX official import remains an alternative. No bypass of institutional login or licensing.\n- **arXiv, SciELO:** pagination depends on search-page HTML and may fail when layouts change. SciELO integration is experimental.
- **PubMed:** ESearch/EFetch APIs may not represent every website sidebar filter. Unsupported filters are blocked.
- **OpenAlex, Crossref, Semantic Scholar, DOAJ:** API queries may differ from web interface ranking, indexing, scope, and filters. Semantic Scholar may rate limit and restrict result counts.
- **bioRxiv/medRxiv:** collection uses the official date-range feed with an optional local title/abstract filter, **not** the same as the website search. A max scan limit can make results incomplete.
- **All sources:** lack of DOI does not prove two records are different. DOI-only deduplication avoids some false merges but leaves some true duplicates unresolved. A preprint and subsequent publication often have different DOIs.

## Inclusion, access, and licensing

Metadata availability does not imply open-access full text. The arXiv PDF option requests up to 20 downloadable PDFs and does not bypass authentication, paywalls, or other access controls. Respect each upstream service's terms and limits. If a request is throttled or fails, label the output as partial and repeat/verify only within the platform's policy.

## Personal information

The extension stores research metadata and search history locally in your browser profile. Exported files persist until the user deletes them. Avoid placing private or sensitive information into public repository issues.
