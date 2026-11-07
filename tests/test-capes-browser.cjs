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
