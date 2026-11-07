"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const script = fs.readFileSync(require("node:path").join(__dirname, "..", "content.js"), "utf8");
const ids = ["delta-panel","delta-source","delta-query-preview","delta-filter-preview","delta-max","delta-format",
"delta-coverage-options","delta-expected-total","delta-audit-result","delta-start","delta-cancel","delta-progress","delta-status",
"delta-one-click","delta-config","delta-ieee-import","delta-ieee-file","delta-ieee-import-run","delta-ieee-total",
"delta-library","delta-library-html","delta-library-csv","delta-library-json","delta-library-ris","delta-library-bib",
"delta-strategy","delta-strategy-export","delta-oa-label","delta-local-label","delta-pdf-label","delta-clear"];
for (const id of ids) assert.ok(script.includes('id="' + id + '"'), "Missing input/control " + id);
assert.match(script, /panel\.replaceChildren\(header/, "Expected progressive disclosure layout");
assert.match(script, /makeFold\("Biblioteca e matriz"/, "Library/review section should be collapsible");
assert.match(script, /makeFold\("Importar CSV oficial"/, "Official IEEE import should remain available");
assert.match(script, /makeFold\("Mais opções"/, "Advanced settings should be collapsible");
assert.match(script, /String\(Boolean\(visible\)\)/, "The opener should synchronize aria-expanded");
assert.match(script, /search_query/, "Search provenance should remain in exports");
console.log("PASS: essential controls, progressive disclosure and accessibility labels present.");
