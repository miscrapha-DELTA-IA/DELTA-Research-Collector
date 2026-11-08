"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const script = fs.readFileSync(require("node:path").join(__dirname, "..", "content.js"), "utf8");
const ids = ["delta-panel","delta-source","delta-query-preview","delta-filter-preview","delta-max","delta-format",
"delta-coverage-options","delta-xref-label","delta-xref","delta-xref-continue","delta-xref-review","delta-xref-cache-clear","delta-expected-total","delta-audit-result","delta-start","delta-cancel","delta-progress","delta-status",
"delta-one-click","delta-config","delta-ieee-action","delta-ieee-file","delta-ieee-import-run","delta-capes-action","delta-capes-file","delta-capes-import-run","delta-capes-diagnostic",
"delta-library","delta-library-html","delta-library-csv","delta-library-json","delta-library-ris","delta-library-bib",
"delta-strategy","delta-strategy-export","delta-oa-label","delta-local-label","delta-pdf-label","delta-clear"];
for (const id of ids) assert.ok(script.includes('id="' + id + '"'), "Missing input/control " + id);
assert.match(script, /pageInfo\.id = "delta-page-info"/, "Page indicator is created dynamically");
assert.match(script, /panel\.replaceChildren\(header/, "Expected progressive disclosure layout");
assert.match(script, /makeFold\("Biblioteca e matriz"/, "Library/review section should be collapsible");
assert.doesNotMatch(script, /makeFold\("Importar CSV oficial"/, "Import pane should not take visual space");
assert.match(script, /fileInput\.click\(\)/, "Import button must open the file chooser");
assert.match(script, /\$\("expected-total"\)\.value/, "CSV import must reuse displayed expected count");
assert.match(script, /"Página " \+ pageNum/, "IEEE page indicator must use URL page number");
assert.match(script, /"arXiv · página "/, "arXiv page indicator must describe pagination");
assert.match(script, /makeFold\("Mais opções"/, "Advanced settings should be collapsible");
assert.match(script, /String\(Boolean\(visible\)\)/, "The opener should synchronize aria-expanded");
assert.match(script, /search_query/, "Search provenance should remain in exports");
console.log("PASS: essential controls, progressive disclosure and accessibility labels present.");

assert.match(script,/await collectCapes\(quick\)/, "CAPES must start the browser navigation collector");
assert.match(script,/async function collectCapes/, "CAPES collector must implement pagination");
assert.match(script,/"capes_browser_navigation_paged_experimental"/, "CAPES audit must identify browser navigation retrieval mode");
assert.match(script,/async function resumeCapesRun\(/, "CAPES must resume after reload");
assert.match(script,/DELTA_CAPES_RUN_SAVE/, "CAPES must persist progress before navigation");
assert.match(script,/location\.assign\(core\.capesPageUrl\(run\.baseUrl,run\.currentPage\)\)/, "CAPES must follow native page parameter");
assert.doesNotMatch(script,/if \(provider === "capes"\) \{ openCapesFile\(\); return; \}/, "CAPES one-click must not force file import");

assert.doesNotMatch(script,/selector:\s*"button\[aria-label\]"/,"CAPES diagnostic must not sample account-header controls");
assert.match(script,/document\.querySelectorAll\("\.result-busca"\)/,"Diagnostic must identify CAPES cards");

assert.match(script,/snapshot\.visibleRange\?\.start===requiredFirst/,"CAPES page data must match requested page range before collecting");
assert.match(script,/visible_start:snapshot\.visibleRange\.start/,"CAPES strategy must record each visible page range");
assert.match(script,/missing_journal:/,"CAPES strategy must report missing bibliographic fields");
assert.match(script,/missing_abstract:/,"CAPES strategy must distinguish missing article abstracts");

assert.match(script,/await verifyAcrossSources\(rows,run\.xrefEnabled/, "CAPES paginated collector must run XRef");
assert.match(script,/await verifyAcrossSources\(rows,!state\.cancel\)/, "Every regular collector must run XRef");
assert.match(script,/await verifyAcrossSources\(parsed\.records\)/, "File importers must run XRef");
assert.match(script,/xref_summary:/, "XRef summary must be included in strategy report");

assert.match(script,/async function continueXrefLibrary\(/,"XRef continuation must be explicitly accessible");
assert.match(script,/DELTA_XREF_CACHE_GET/,"Cross-reference must preload persistent metadata");
assert.match(script,/DELTA_XREF_CACHE_SET/,"Cross-reference must retain verified metadata after lookup");
assert.match(script,/await verifyAcrossSources\(batch,true\)/,"Continuation must use the universal engine");
assert.match(script,/function exportNoDoiReview\(/,"DOI candidate review must be separate and user-triggered");
assert.match(script,/UNVERIFIED_CANDIDATE_DO_NOT_AUTO_ASSIGN|candidateReview\(/,"Candidates must not be assigned automatically");
assert.match(script,/DELTA_biblioteca_xref_/,"Continuations must export an audited bibliographic CSV");

assert.match(script,/generator:"DELTA Research Collector CAPES scoped diagnostic "\+chrome\.runtime\.getManifest\(\)\.version/,"Diagnostic generator must use actual installed version");
assert.match(script,/visible_page_range:parsed\.visibleRange/,"Diagnostic must expose rendered page range");
assert.match(script,/rendered_page_matches_url:/,"Diagnostic must flag URL/DOM mismatch");
assert.doesNotMatch(script,/CAPES scoped diagnostic 0\.5\.9/,"Diagnostic must not contain stale hard-coded versions");

assert.match(script,/DELTA_EXPORT_FILE/,"Library exports must use download API, not simulated anchor clicks");
assert.match(script,/Download de .* artigos únicos iniciado/,"Library UI must only confirm download initiation");
assert.match(script,/downloadId/,"Library must check downloads API receipt");
