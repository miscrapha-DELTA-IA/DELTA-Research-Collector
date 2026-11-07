"use strict";
const assert=require("node:assert/strict");
require("../collector-core.js");
const core=globalThis.DELTA_CORE;
assert.equal(typeof core.parseCapesPage,"function");
assert.equal(typeof core.findCapesNextPage,"function");
function paper(i){
  const title="Clinical prediction and feedback study "+i;
  const article={tagName:"A",className:"",textContent:title,getAttribute:key=>key==="href"?"/index.php/acervo/detalhe-"+i+".html":null,querySelector:()=>null};
  return {
    id:"",
    textContent:title+" 2025 DOI: 10.1234/CAPES."+i,
    getAttribute:()=>null,closest:()=>null,
    querySelector:selector=>selector.includes("data-testid*='title'")?article:null,
    querySelectorAll:selector=>selector.includes("[data-testid*='title'")?[article]:[],
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


// Regression informed by actual CAPES 2026 page diagnostics:
// 100 .result-busca cards, nav.br-pagination, "1–100 de 456 itens",
// pagination-arrows with textless buttons, and no <article>/<h3>.
const capesTitle = "Beware the self-fulfilling prophecy: enhancing clinical decision-making with AI";
function realCapesCard(i) {
  const title = (i===1?capesTitle:"Scientific prediction and outcomes in clinical practice "+i);
  const link = {
    tagName:"A",className:"",textContent:i+". "+title,
    getAttribute:key=>key==="href"?"/index.php/acervo/item-"+i:null,querySelector:()=>null
  };
  const authors = {textContent:"Researcher "+i+", Researcher B"};
  return {
    tagName:"DIV",id:"",className:"col-sm-12 mb-1 result-busca",
    textContent:(i-1)+" "+(i-1)+" Artigo Revisado por pares "+i+". "+title+
      " Researcher "+i+", Researcher B Tópico(s): 2026 - Scientific Journal DOI: 10.8888/CAPES."+i,
    getAttribute:()=>null,closest:()=>null,
    querySelector:selector=>selector.includes("[class*='author'")?authors:null,
    querySelectorAll:selector=>{
      if(selector.includes("doi.org"))return [];
      if(selector.includes("[data-testid*='title'"))return [link];
      return [];
    }
  };
}
const currentCapesCards=Array.from({length:100},(_,i)=>realCapesCard(i+1));
const pagerReal={
  tagName:"NAV",className:"br-pagination",
  textContent:"Exibir 30 50 100 1–100 de 456 itens Página 1 2 3 4 5",
  querySelector:selector=>selector===".pagination-arrows"?arrowGroup:null,
  querySelectorAll:selector=>[],
};
const pageRoot={
  textContent:"Resultados de pesquisa. 1–100 de 456 itens.",
  querySelectorAll:selector=>selector===".result-busca"?currentCapesCards:[]
};
const actualShapeDoc={
  querySelector:()=>pageRoot,
  querySelectorAll:selector=>selector.includes("nav.br-pagination")?[pagerReal]:selector.includes("nav[aria-label*='pagin'")?[pagerReal]:[]
};
const realParsed=core.parseCapesPage(actualShapeDoc,"https://www.periodicos.capes.gov.br/index.php/acervo/buscador.html?num=100&q=clinical");
assert.equal(realParsed.candidates,100);
assert.equal(realParsed.records.length,100,"All visible CAPES result-busca cards should be collected");
assert.equal(realParsed.total,456,"CAPES 'de 456 itens' count should be recognized");
assert.equal(realParsed.records[0].title,capesTitle,"Title must not include badges, index or authors");
assert.equal(realParsed.records[0].doi,"10.8888/capes.1");
assert.equal(realParsed.records[99].doi,"10.8888/capes.100");
assert.equal(new Set(realParsed.records.map(r=>r.identifier)).size,100);
const left={
  tagName:"BUTTON",className:"br-button circle",textContent:"",
  disabled:true,hasAttribute:()=>false,getAttribute:()=>null,querySelector:()=>null
};
const right={
  tagName:"BUTTON",className:"br-button circle",textContent:"",
  disabled:false,hasAttribute:()=>false,getAttribute:()=>null,querySelector:()=>null,click:()=>{}
};
const arrowGroup={querySelectorAll:()=>[left,right]};
assert.equal(core.findCapesNextPage(actualShapeDoc),right,"Select right arrow in CAPES pagination when no text labels");
console.log("PASS: 100 CAPES result-busca cards, 456 count, metadata and icon-only pagination.");


// Regression from actual CAPES filtered export (Nov 7 2026):
// num=30&page=4&publishyear=2019:2026, 118 total, 28 items last page.
const capesFiltered="https://www.periodicos.capes.gov.br/index.php/acervo/buscador.html?q=clinical+prognosis&source=all&num=30&page=4&publishyear=2019%3A2026";
const page1=new URL(core.capesPageUrl(capesFiltered,1));
assert.equal(page1.searchParams.get("page"),"1");
assert.equal(page1.searchParams.get("num"),"30");
assert.equal(page1.searchParams.get("publishyear"),"2019:2026");
assert.equal(page1.searchParams.get("q"),"clinical prognosis");
assert.equal(page1.searchParams.get("source"),"all");
assert.equal(new URL(core.capesPageUrl(capesFiltered,3)).searchParams.get("page"),"3");
assert.equal(core.capesSearchKey(capesFiltered),core.capesSearchKey(page1.href),
  "Changing page only must not change search identity");
assert.equal(118-30*3,28,"Page 4 legitimately contains 28 records");
assert.throws(()=>core.capesPageUrl("https://evil.example/search?q=test",1),/CAPES/);
assert.throws(()=>core.capesPageUrl(capesFiltered,0),/página fora/);
console.log("PASS: CAPES page-4 to page-1 normalization preserves search filters.");


// Metadata regression from the scoped CAPES DOM diagnostic:
// title link, multiple "view-autor" anchors, separate publisher/journal
// paragraph and search snippet with an unrelated year.
const metaTitle={tagName:"A",textContent:"Clinical prediction outcomes study",className:"titulo-busca",
  getAttribute:k=>k==="href"?"/index.php/acervo/buscador.html?task=detalhes&id=W500":null};
const metaAuthor1={tagName:"A",textContent:"Researcher One"};
const metaAuthor2={tagName:"A",textContent:"Researcher Two"};
const pubLine={textContent:"2023 - Example Publisher | Clinical Research Journal"};
const metaSnippet={textContent:"The 2013 and 2017 papers are discussed..."};
const doiAnchor={getAttribute:k=>k==="href"?"https://doi.org/10.9999/study.42":null};
const metaCard={
 textContent:"2013 2017 Clinical prediction outcomes study DOI: 10.9999/study.42Google",
 id:"",getAttribute:()=>null,closest:()=>null,
 querySelector:()=>null,
 querySelectorAll:selector=>{
  if(selector==="a.view-autor")return [metaAuthor1,metaAuthor2];
  if(selector==="p.text-down-01")return [pubLine];
  if(selector.includes('doi.org/'))return [doiAnchor];
  if(selector.includes("[data-testid*='title'"))return [metaTitle];
  return [];
 }
};
const metaRoot={textContent:"91–118 de 118 itens",querySelectorAll:selector=>selector===".result-busca"?[metaCard]:[]};
const metaPager={textContent:"Exibir 30 50 100 91–118 de 118 itens",
  querySelector:()=>null,querySelectorAll:()=>[]};
const metaDoc={querySelector:()=>metaRoot,
  querySelectorAll:selector=>selector.includes("nav.br-pagination")?[metaPager]:[]};
const meta=core.parseCapesPage(metaDoc,"https://www.periodicos.capes.gov.br/index.php/acervo/buscador.html?q=prediction&page=4&num=30");
assert.equal(meta.records.length,1);
assert.equal(meta.visibleRange.start,91);
assert.equal(meta.visibleRange.end,118);
assert.equal(meta.total,118);
assert.deepEqual(meta.records[0].authors,["Researcher One","Researcher Two"]);
assert.equal(meta.records[0].journal,"Clinical Research Journal");
assert.equal(meta.records[0].year,"2023","Never infer the publication year from snippet dates");
assert.equal(meta.records[0].doi,"10.9999/study.42","DOI link must take priority over concatenated text");
assert.equal(meta.records[0].abstract,"","Search snippets must not be represented as complete abstracts");
assert.deepEqual(meta.records[0].sources,["Portal CAPES"]);
// When only concatenated text is available, an apparent "Google" suffix
// is ambiguous and must not be exported as a verified DOI.
const badDoi={...metaCard,querySelectorAll:selector=>
  selector.includes('doi.org/')?[]:metaCard.querySelectorAll(selector)};
const badRoot={...metaRoot,querySelectorAll:sel=>sel===".result-busca"?[badDoi]:[]};
const badDoc={...metaDoc,querySelector:()=>badRoot};
assert.equal(core.parseCapesPage(badDoc).records[0].doi,"");
console.log("PASS: CAPES structured publication fields, multi-author capture, range and DOI ambiguity guard.");
