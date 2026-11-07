"use strict";
const assert=require("node:assert/strict");
require("../collector-core.js");
const core=globalThis.DELTA_CORE;
const parse=core.parseCapesNativeExport;
assert.equal(typeof parse,"function","CAPES parser must be available from the core alone");
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

const fs=require("node:fs");
const manifest=JSON.parse(fs.readFileSync(require("node:path").join(__dirname,"..","manifest.json"),"utf8"));
assert.ok(manifest.content_scripts[0].js.includes("collector-core.js"));
assert.ok(!manifest.content_scripts[0].js.includes("capes-import.js"),"No separate CAPES content script dependency");
assert.match(fs.readFileSync(require("node:path").join(__dirname,"..","content.js"),"utf8"),/core\.parseCapesNativeExport/, "UI must read the core parser");

// Regression: a real CAPES export contained six @Revisão records and 24 other types.
// The pre-fix parser silently returned 24 records with skipped=0 instead of 30.
const publicationTypes=Array.from({length:30},(_,i)=>i<6?"Revisão":i===6?"Carta":i===7?"Editorial":i===8?"book":"article");
const nativeBib=publicationTypes.map((type,i)=>
  "@"+type+"{W"+(8000000+i)+",\n"+
  "title={CAPES synthetic record "+(i+1)+"},\n"+
  "author={Researcher "+(i+1)+"},\n"+
  "year={2026},\n"+
  "doi={10.9999/CAPES."+(i+1)+"}\n}\n").join("\n");
const nativeRis=publicationTypes.map((type,i)=>
  "TY  - "+type+"\nID  - W"+(8000000+i)+"\nTI  - CAPES synthetic record "+(i+1)+
  "\nAU  - Researcher "+(i+1)+"\nPY  - 2026\nDO  - 10.9999/CAPES."+(i+1)+"\nER  - \n").join("\n");
const importedBib=parse(nativeBib,"CAPES-Revisão.bib");
const importedRis=parse(nativeRis,"CAPES-Revisão.ris");
assert.equal(importedBib.imported,30,"All 30 original records must be preserved");
assert.equal(importedBib.skipped,0,"Unicode entry types are not ignored");
assert.equal(importedRis.imported,30);
assert.deepEqual(importedBib.records.map(x=>x.identifier),importedRis.records.map(x=>x.identifier));
assert.deepEqual(importedBib.records.map(x=>x.title),importedRis.records.map(x=>x.title));
assert.deepEqual(importedBib.records.map(x=>x.doi),importedRis.records.map(x=>x.doi));
assert.equal(new Set(importedBib.records.map(x=>x.identifier)).size,30);
assert.throws(()=>parse(nativeBib+"\n@🧬{W1,\ntitle={Unknown biomedical article}\n}","unknown.bib"),/inconsistência/);
console.log("PASS: CAPES 30-record Unicode-type regression + BibTeX/RIS parity.");
