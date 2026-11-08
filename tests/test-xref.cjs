"use strict";
const assert=require("node:assert/strict");
require("../collector-core.js");
require("../xref-engine.js");
const x=globalThis.DELTA_XREF;
assert.ok(x&&typeof x.enrichRecords==="function");
const original={source:"Portal CAPES",identifier:"W-42",title:"Predictive Clinical Decision-Making with AI",
  doi:"10.1234/example.42",year:"2025",date:"",journal:"",authors:["Ana Silva"],abstract:""};
const reg={source:"Crossref",metadata_url:"https://api.crossref.org/works/10.1234/example.42",
  doi:"10.1234/example.42",title:"Predictive clinical decision making with AI",
  authors:["Ana Silva","Bruno Costa"],year:"2025",date:"2025-04-12",journal:"Medical AI"};
const processed=x.reconcile(original,reg,"2026-11-07T00:00:00.000Z");
assert.equal(processed.xref.status,"registry_match");
assert.equal(processed.journal,"Medical AI");
assert.equal(processed.date,"2025-04-12");
assert.deepEqual(processed.authors,["Ana Silva"],"Do not overwrite partial original authors");
assert.equal(processed.xref.original.journal,"");
assert.equal(processed.xref.original.date,"");
assert.equal(processed.xref.field_provenance.journal.source,"Crossref");
assert.equal(processed.xref.field_provenance.date.action,"filled_originally_empty");
assert.equal(processed.xref_source,"Crossref");
assert.equal(processed.xref_status,"registry_match");
assert.equal(original.journal,"","Never modify original");
assert.equal(processed.abstract,"","Do not copy potentially copyrighted abstracts");
assert.deepEqual(x.reconcile({...original,journal:"Original journal"},reg).journal,"Original journal");
const titleConflict=x.reconcile(original,{...reg,title:"Completely unrelated paper on plant genomics"});
assert.equal(titleConflict.xref_status,"conflict");
assert.ok(titleConflict.xref.conflicts.includes("title_mismatch"));
assert.equal(titleConflict.journal,"");
const yearConflict=x.reconcile(original,{...reg,year:"2008"});
assert.ok(yearConflict.xref.conflicts.includes("publication_year_mismatch"));
const authorConflict=x.reconcile(original,{...reg,authors:["Zoe Johnson"]});
assert.ok(authorConflict.xref.conflicts.includes("author_mismatch"));
assert.ok(x.reconcile(original,{...reg,doi:"10.1111/other"}).xref.conflicts.includes("doi_mismatch"));
assert.equal(x.reconcile({...original,doi:""},reg).xref_status,"missing_or_invalid_doi");
assert.equal(x.reconcile({...original,doi:"10.1234/anythinggoogle"},reg).xref_status,"missing_or_invalid_doi");
const crossref=x.crossref({message:{
 DOI:"10.1234/EXAMPLE.42",title:["Predictive Clinical Decision-Making with AI"],
 author:[{given:"Ana",family:"Silva"}],
 published:{"date-parts":[[2025,4,12]]},
 "container-title":["Medical AI"]
}});
assert.equal(crossref.doi,"10.1234/example.42");
assert.equal(crossref.date,"2025-04-12");
const data=x.datacite({data:{attributes:{doi:"10.6084/m9.figshare.123",
 titles:[{title:"Research dataset"}],creators:[{name:"Ana Silva"}],
 publicationYear:2025,container:{title:"Figshare"},dates:[{dateType:"Issued",date:"2025-02-01"}]}}});
assert.equal(data.source,"DataCite");
assert.equal(data.title,"Research dataset");
assert.equal(data.authors[0],"Ana Silva");
assert.ok(x.similarity("A study: outcomes in health","A Study — Outcomes in Health")>.92);
const report=(async()=>{
 const data=[original,{...original,identifier:"W-dup"},
   {...original,doi:"",identifier:"W-no-doi"},
   {...original,doi:"10.1234/another",identifier:"W-other"},
   {...original,doi:"10.1234/third",identifier:"W-third"}];
 let lookups=0;
 const r=await x.enrichRecords(data,async doi=>{
   lookups++;return doi==="10.1234/example.42"?reg:null;
 },{maxLookups:2});
 assert.equal(lookups,2,"Deduplicate DOI lookups and enforce budget");
 assert.equal(r.records.length,5);
 assert.equal(r.records[0].xref_status,"registry_match");
 assert.equal(r.records[1].xref_status,"registry_match");
 assert.equal(r.records[2].xref_status,"missing_or_invalid_doi");
 assert.equal(r.records[3].xref_status,"not_found");
 assert.equal(r.records[4].xref_status,"not_checked_budget");
 assert.equal(r.summary.records,5);
 assert.equal(r.summary.unique_doi_lookups,2);
 assert.equal(r.summary.registry_match,2);
 assert.equal(r.summary.not_checked_budget,1);
 assert.match(globalThis.DELTA_CORE.toCsv(r.records),/xref_status/);
 assert.match(globalThis.DELTA_CORE.toBibtex(r.records),/XRef: registry\\_match/);
 assert.match(globalThis.DELTA_CORE.toRis(r.records),/XRef: registry_match/);
 console.log("PASS: DOI identity/author/year conflict guards, provenance, registry parsing, budgets and exports.");
})();
report.catch(error=>{console.error(error);process.exitCode=1;});
