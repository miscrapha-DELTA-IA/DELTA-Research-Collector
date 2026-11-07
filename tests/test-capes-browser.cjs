"use strict";
const assert=require("node:assert/strict");
require("../collector-core.js");
const core=globalThis.DELTA_CORE;
assert.equal(typeof core.parseCapesPage,"function");
assert.equal(typeof core.findCapesNextPage,"function");
function paper(i){
  const title="Clinical prediction and feedback study "+i;
  const article={textContent:title,getAttribute:key=>key==="href"?"/index.php/acervo/detalhe-"+i+".html":null,querySelector:()=>null};
  return {
    id:"",
    textContent:title+" 2025 DOI: 10.1234/CAPES."+i,
    getAttribute:()=>null,closest:()=>null,
    querySelector:selector=>selector.includes("data-testid*='title'")?article:null,
    querySelectorAll:selector=>selector.includes('doi.org')?[]:[],
  };
}
const data=Array.from({length:100},(_,i)=>paper(i+1));
const root={
 textContent:"456 resultados de busca "+data.map(p=>p.textContent).join("\n"),
 querySelectorAll:sel=>sel==="[data-testid*='result' i]"?data:[],
};
const doc={querySelector:()=>root,querySelectorAll:()=>[]};
const parsed=core.parseCapesPage(doc,"https://www.periodicos.capes.gov.br/index.php/acervo/buscador.html?q=test");
assert.equal(parsed.records.length,100,"One page of 100 records must be parsed");
assert.equal(parsed.total,456);
assert.equal(parsed.records[0].doi,"10.1234/capes.1");
assert.equal(parsed.records[0].title,"Clinical prediction and feedback study 1");
assert.match(parsed.records[0].article_url,/\/index\.php\/acervo\/detalhe-1\.html$/);
assert.equal(parsed.records[0].access_status,"unknown");
const disabled={textContent:"Próximo",disabled:true,hasAttribute:()=>false,getAttribute:()=>null,className:""};
const next={textContent:"Próxima",disabled:false,hasAttribute:()=>false,getAttribute:()=>null,className:"",click:()=>{}};
const scope={querySelectorAll:()=>[disabled,next]};
const withPagination={querySelectorAll:()=>[scope]};
assert.equal(core.findCapesNextPage(withPagination),next);
assert.equal(core.findCapesNextPage({querySelectorAll:()=>[]}),null);
const empty=core.parseCapesPage({querySelector:()=>({textContent:"456 resultados",querySelectorAll:()=>[]})});
assert.equal(empty.records.length,0,"No records must not be invented");
console.log("PASS: CAPES visible DOM parsing, metadata, count, pagination and empty fail-closed.");
