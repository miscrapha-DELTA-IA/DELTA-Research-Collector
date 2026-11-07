# Changelog

## [0.5.0] — 2026-11-07

- Added an offline, self-contained interactive HTML screening matrix with searchable records, readable abstracts, access-status badges and manual screening decisions.
- Added notes and exclusion reasons, annotated CSV output, and portable JSON screening-decision export/reimport.
- Added a count coverage audit to the search strategy manifest, with optional original provider/UI total and explicit non-equivalence warning.
- Integrated the matrix into current-search exports, IEEE native CSV imports and local-library exports.
- Added scientific usage documentation, multilingual README guidance, and regression tests. The collector remains experimental; no full-record-set equivalence is claimed.

## v0.4.1 — IEEE Xplore full-results import

- Clarify that direct IEEE capture includes only currently visible results (25 per page by default).
- Add a local importer for IEEE Xplore's native CSV export, including DOI-based deduplication and CSV/BibTeX/RIS/JSON export.
- Allow recording expected total and coverage percentage without claiming exhaustive retrieval when unverified.
- Preserve search URL, filters and strategy metadata with imported records.
- Make the installer workflow version independent.

# Changelog

## 0.4.0

- Corrigido redirecionamento involuntário do ícone para arXiv.
- IEEE Xplore experimental (cartões visíveis).
- Estratégia JSON com expressão, filtros e proveniência.
- Classificação de acesso, consulta opcional OpenAlex por DOI.


All notable changes for the public repository are described here.

## [0.3.0] — 2026-11

- Added DOAJ, experimental SciELO, bioRxiv and medRxiv adapters.
- Introduced local unified library, DOI-based deduplication, collection history and RIS export.
- Continued support for arXiv, Europe PMC, PubMed, OpenAlex, Crossref and Semantic Scholar.
- Kept the arXiv PDF download option and source-specific limitations.

## [0.2.0]

- Added PubMed, OpenAlex, Crossref and Semantic Scholar adapters.

## [0.1.1]

- Corrected installable ZIP layout (`manifest.json` at root).

## [0.1.0]

- Initial experimental arXiv and Europe PMC collection.

> These notes describe project development versions, not independently validated live API integrations.
