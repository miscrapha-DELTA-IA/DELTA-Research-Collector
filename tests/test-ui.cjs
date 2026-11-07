"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const script = fs.readFileSync(require("node:path").join(__dirname, "..", "content.js"), "utf8");
const ids = ["delta-panel","delta-source","delta-query-preview","delta-filter-preview","delta-max","delta-format",
"delta-coverage-options","delta-expected-total","delta-audit-result","delta-start","delta-cancel","delta-progress","delta-status",
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

assert.match(script,/capes:collectCapes/, "CAPES must have a direct browser collector");
assert.match(script,/async function collectCapes/, "CAPES collector must implement pagination");
assert.match(script,/"capes_visible_search_pages_experimental"/, "CAPES audit must identify experimental retrieval mode");
assert.doesNotMatch(script,/if \(provider === "capes"\) \{ openCapesFile\(\); return; \}/, "CAPES one-click must not force file import");

assert.doesNotMatch(script,/selector:\s*"button\[aria-label\]"/,"CAPES diagnostic must not sample account-header controls");
assert.match(script,/document\.querySelectorAll\("\.result-busca"\)/,"Diagnostic must identify CAPES cards");
