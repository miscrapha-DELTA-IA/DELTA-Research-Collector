"use strict";
const assert=require("node:assert/strict");
require("../collector-core.js");
require("../capes-import.js");
const core=globalThis.DELTA_CORE;
const parse=globalThis.DELTA_CAPES.parseNativeExport;
assert.equal(core.detectProvider("https://www.periodicos.capes.gov.br/"),"capes");
assert.equal(core.detectProvider("https://periodicos.capes.gov.br/index.php"),"capes");
assert.equal(core.detectProvider("https://www-periodicos-capes-gov-br.ez1.periodicos.capes.gov.br/index.php"),"capes");
assert.equal(core.detectProvider("https://malicious.example/?redirect=periodicos.capes.gov.br"),null);
const ris=["TY  - JOUR","TI  - Dengue prediction in Brazil","AU  - Silva, Ana",
 "AU  - Souza, José","PY  - 2025","DO  - 10.1111/CAPES.001",
 "AB  - Abstract first","  continued line.","ER  - ",
 "TY  - JOUR","TI  - Second paper","PY  - 2026","ER  - "].join("\r\n");
const r=parse(ris,"export.ris");
assert.equal(r.imported,2);
assert.deepEqual(r.records[0].authors,["Silva, Ana","Souza, José"]);
assert.equal(r.records[0].doi,"10.1111/capes.001");
assert.equal(r.records[0].abstract,"Abstract first continued line.");
assert.equal(r.records[1].access_status,"unknown");
assert.match(core.toCsv(r.records),/Dengue prediction/);
const bib="@article{capes24,\n title = {{Complex} Title},\n author = {A, Ana and B, Bruno},\n doi = {10.1234/ABC},\n year = {2024},\n abstract = {Study with {nested} delimiters},\n url = {https://example.org/paper},\n}\n";
const b=parse(bib,"export.bib");
assert.equal(b.imported,1);
assert.equal(b.records[0].doi,"10.1234/abc");
assert.equal(b.records[0].title,"{Complex} Title");
assert.equal(b.records[0].identifier,"capes24");
assert.deepEqual(b.records[0].authors,["A, Ana","B, Bruno"]);
assert.match(core.toRis(b.records),/Study with/);
assert.throws(()=>parse("TY  - JOUR\nTI  - Incomplete","x.ris"),/nenhum registro/);
assert.throws(()=>parse("Not a bib","x.txt"),/RIS ou BibTeX/);
assert.throws(()=>parse("@article{x,title={A}}","x.bib"),/nenhum registro/);
console.log("PASS: CAPES native RIS/BibTeX imports.");
